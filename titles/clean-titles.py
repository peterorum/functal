#!/usr/bin/python3

# remove titles with negative sentiment

import os
# import re
import sys
import getopt
from sentiment import get_sentiment

from pprint import pprint

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db_topics = client['topics']
db_functal = client['functal']

#--- find titled


def get_functals_with_title():
    return list(db_functal.images.find({'title': {'$exists': True}}))

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
        if sentiment == 'negative':
            pprint('------------------- removed')
            db_functal.images.update({'_id': functal['_id']}, {'$unset': {'title': ''}})

    client.close()

#---

main(sys.argv[1:])
