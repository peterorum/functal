#!/usr/bin/python3

# add a title to any functal without one

import os
#import re
# import sys
# import json
#import random
#import collections

from pprint import pprint
# pp = pprint.PrettyPrinter(indent=4)

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db_topics = client['topics']
db_functal = client['functal']

#--- find all functals


def get_functals():
    return db_functal.images.find()

#--- find untitled


def get_functals_without_title():
    return db_functal.images.find({'title': {'$exists': False}})

#--- run


def run():
    #functals = get_functals_without_title()
    functals = get_functals()

    for functal in functals:
        # pprint(functal)

        topic = functal['topic']

        title = db_topics.titles.find_one({'topic': topic})
        pprint(topic + ': ' + title['title'])

        functal['title'] = title['title']

        db_functal.images.update({'_id': functal['_id']}, {'$set': functal}, upsert=False)

        # remove used title
        db_topics.titles.remove(title)

    client.close()

#---

run()
