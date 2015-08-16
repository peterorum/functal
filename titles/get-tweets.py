#!/usr/bin/python3

import os
import random
import time
# import re
# import sys
#import json
import pprint

import twitter

# import pudb
# pu.db

from pymongo import MongoClient
client = MongoClient(os.getenv('mongo_client'))

# --- get_tweets


def get_tweets(topic):
    print('topic : ' + topic)

    search_results = twit.search.tweets(q=topic, lang='en', result_type='popular')
    # print('search_results')
    # pp.pprint(search_results)

    texts = [{'id': tweet['id_str'], 'text': tweet['text'], 'user': tweet['user']['name']}
             for tweet in search_results['statuses'] if topic in tweet['text']]

    print('tweets: ' + str(len(texts)))

    if len(texts) > 0:
        pp.pprint(texts)

#--- global

pp = pprint.PrettyPrinter(indent=4)
auth = twitter.oauth.OAuth(os.environ['token'], os.environ['token_secret'], os.environ[
    'consumer_key'], os.environ['consumer_secret'])
twit = twitter.Twitter(auth=auth)

#--- main


def main():

    db = client('topics')

    # topics = ["red", "orange", "yellow", "green", "blue", "purple",
    #          "pink", "triangle", "square", "circle", "arrow", "asterisk", "wavy", "star"]

    # while True:
    # get_tweets('triangle')
    #    get_tweets(topics[random.randint(0, len(topics) - 1)])
    #    time.sleep(60)

#--- run

main()
