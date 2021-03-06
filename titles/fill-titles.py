#!/usr/bin/python3

# add a title to any functal without one

# to clear all titles
# use topics
# db.titles.remove({})
# use images
# db.images.update({}, {$unset: {title: ''}}, {multi: true})


import os
# import re
import sys
import getopt
# import json
# import random
# import collections
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
    return list(db_functal.images.find({'$or': [{'title': {'$exists': False}}, {'title': {'$eq': ''}}]}))

#--- run


def main(argv):

    try:
        opts, remainder = getopt.getopt(argv, "hu", ["help", "untitled"])
    except getopt.GetoptError as err:
        print(err)
        sys.exit(2)

    doUntitled = False

    for opt, arg in opts:
        if opt == '-h':
            print('fill-titles.py -u --untitled')
            client.close()
            sys.exit()
        elif opt in ("-u", "--untitled"):
            doUntitled = True

    if doUntitled:
        functals = get_functals_without_title()
    else:
        functals = get_functals()

    print('count: ' + str(len(functals)))

    for functal in functals:
        # pprint(functal)

        topic = functal.get('topic', 'watch')

        title = db_topics.titles.find_one({'topic': topic})

        if title is None:
            # make more titles
            print('out of titles for ' + topic + ' - shelling')
            subprocess.call(['./get-tweets.py', '-t', topic])
            subprocess.call(['./get-titles-nltk.py'])
            title = db_topics.titles.find_one({'topic': topic})

        if title is not None:
            print(topic + ': ' + title['title'])

            functal['title'] = title['title']
            functal['topic'] = topic

            db_functal.images.update({'_id': functal['_id']}, {'$set': functal}, upsert=False)

            # remove used title
            db_topics.titles.remove(title)
        else:
            print('still no title for ' + topic)

    client.close()

#---

main(sys.argv[1:])
