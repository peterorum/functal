#!/usr/bin/python3

# add a title to any functal without one

import os
#import re
#import sys
# import json
#import random
#import collections
import time
import subprocess

from pprint import pprint
# pp = pprint.PrettyPrinter(indent=4)

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db_topics = client['topics']
db_functal = client['functal']

#--- find all functals


def get_functals():
    return list(db_functal.images.find())

#--- find untitled


def get_functals_without_title():
    return list(db_functal.images.find({'title': {'$exists': False}}))

#--- run


def run():
    #functals = get_functals_without_title()
    functals = get_functals()

    for functal in functals:
        # pprint(functal)

        topic = functal.get('topic', None)

        if topic is not None:
            title = db_topics.titles.find_one({'topic': topic})

            if title is None:
                # give enough time for new titles to be generated by 5 min cron & try again
                print('out of titles for ' + topic + ' - shelling')
                subprocess.call(['./get-tweets.py', '-t', topic])
                print('shelling to get titles')
                subprocess.call(['./get-titles.py'])
                print('try title again')
                title = db_topics.titles.find_one({'topic': topic})

            if title is not None:
                print(topic + ': ' + title['title'])

                functal['title'] = title['title']

                db_functal.images.update({'_id': functal['_id']}, {'$set': functal}, upsert=False)

                # remove used title
                db_topics.titles.remove(title)
            else:
                print('still no title for ' + topic)

        else:
            print(functal['name'] + ': no topic')

    client.close()

#---

run()
