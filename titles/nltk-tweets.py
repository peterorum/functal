#!/usr/bin/python3

import nltk
import os
import re
# import sys
# import random
# import collections

from pprint import pprint

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db = client['topics']

possibly_sensitive_words = set(line.strip().replace(r'^', r'\b').replace(r'$', r'\b')
                               for line in open(os.getenv('functal_folder') + '/words/words.txt') if len(line.strip()) > 0)

sensitive_re = '|'.join(list(possibly_sensitive_words))


def analyze_tweets():
    total_tweets = db.tweets.find().count()
    print('total tweets: ' + str(total_tweets))

    # about 7% are sensitive
    sensitive_tweets = list([tweet['text'] for tweet in db.tweets.find({'text': {'$regex': sensitive_re}})])
    print('total sensitive tweets: ' + str(round(len(sensitive_tweets) / total_tweets * 100, 2)) + '%')
    pprint(sensitive_tweets[:5])


def get_corpus():

    words = []

    topic = 'grid'

    tweets = set([tweet['text'] for tweet in db.tweets.find({'topic': topic})])

    for tweet in tweets:
        text = tweet.lower()

        # remove links
        text = re.sub(r'http[^\b]*', '', text)

        # remove names
        text = re.sub(r'@[^\b]*', '', text)

        # remove hashtags
        text = re.sub(r'#[^\b]*', '', text)

        # remove special chars
        text = re.sub(r'[!]', '', text)

        # remove entities
        text = re.sub(r'&amp;', 'and', text)
        text = re.sub(r'&.*;', '', text)

        words = words + nltk.tokenize.WhitespaceTokenizer().tokenize(text)

    return nltk.Text(words)

#--- main


def main():

    # analyze_tweets()

    corpus = get_corpus()

    pprint(corpus.concordance('grid'))

#---

main()
