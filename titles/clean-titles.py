#!/usr/bin/python3

# remove titles with negative sentiment

import os
# import re
import sys
import getopt
import json
import urllib.request
import urllib.parse

from pprint import pprint

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db_topics = client['topics']
db_functal = client['functal']

#--- find titled


def get_functals_with_title():
    return list(db_functal.images.find({'title': {'$exists': True}}))

#--- get_sentiment


def get_sentiment(text):

    # retunrs neg, pos or neutral

    sentimentUrl = 'https://japerk-text-processing.p.mashape.com/sentiment/'

    text = {
        "language": "english",
        "text": text
    }

    data = urllib.parse.urlencode(text)
    data = data.encode('utf-8')

    headers = {
        "X-Mashape-Key": "jdCBpGtsH0mshRoceXM5JpCevqhop1ZL1DWjsnWzicw4mg6J6i",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }

    # post

    req = urllib.request.Request(sentimentUrl, data=data, headers=headers)

    response = urllib.request.urlopen(req)

    sentiment = json.loads(response.read().decode('utf-8'))

    # pprint(sentiment['label'])

    return sentiment['label']

#--- run


def main(argv):

    try:
        opts, _ = getopt.getopt(argv, "h", ["help"])
    except getopt.GetoptError as err:
        print(err)
        sys.exit(2)

    for opt, _ in opts:
        if opt == '-h':
            print('clean-titles.py')
            client.close()
            sys.exit()

    functals = get_functals_with_title()

    #functals = functals[0: 10]

    print('count: ' + str(len(functals)))

    for functal in functals:
        # pprint(functal)

        title = functal['title']

        sentiment = get_sentiment(title)

        pprint(title)
        pprint(sentiment)

        # wipe negative titles
        if sentiment == 'neg':
            pprint('--- removed')
            db_functal.images.update({'_id': functal['_id']}, {'$unset': {'title': ''}})

    client.close()

#---

main(sys.argv[1:])
