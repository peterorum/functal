#!/usr/bin/python3

import nltk
import os
# import re
# import sys
# import random
# import collections

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
    tweets = list([tweet['text'] for tweet in db.tweets.find({'topic': topic})])

    return tweets

#--- get words by flattening


def get_words(tweets):

    # words = [w for w in [word_tokenize(tweet) for tweet in tweets]]
    wordsLists = [nltk.tokenize.word_tokenize(tweet) for tweet in tweets]

    words = [word.lower() for wordList in wordsLists
             for word in wordList]

    return words


def lexical_diversity(words):
    return len(words) / len(set(words))


#--- main


def main():

    topics = get_topics()

    for topic in topics[:1]:
        print('topic: ' + topic)

        tweets = get_tweets(topic)

        words = get_words(tweets)

        print('total words: ' + str(len(words)))
        print('unique words: ' + str(len(set(words))))
        print('lexical diversity: ' + str(lexical_diversity(words)))

        print('Freq dist')
        fd = nltk.FreqDist(words)
        fds = sorted(fd, key=fd.get, reverse=True)[:10]
        pprint([(w, fd[w]) for w in fds])

#---

main()
