#!/usr/bin/python3

import nltk
import os
#import re
#import sys
#import random
#import collections

from pprint import pprint

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db = client['topics']

# --- get_topics


def get_topics():
    topics = list(set([tweet['topic'] for tweet in db.tweets.find()]))

    return topics

# --- get_tweets


def get_tweets(topic):
    tweets = set([tweet['text'] for tweet in db.tweets.find({'topic': topic})])

    return tweets

#--- get words


#--- main


def main():

    topics = get_topics()

    for topic in topics[0]:
        print('topic: ' + topic)

        tweets = get_tweets(topic)

        pprint(tweets)
#---

main()
