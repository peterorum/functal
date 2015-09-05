#!/usr/bin/python3

# run hourly to keep enough titles per topic

import os
import re
import sys
# import json
import random
import collections
import nltk

from pprint import pprint
# pp = pprint.PrettyPrinter(indent=4)

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db = client['topics']

possibly_sensitive_words = set(line.strip()
                               for line in open(os.getenv('functal_folder') + '/words/words.txt') if len(line.strip()) > 0)


# --- get_topics


def get_topics():
    topics = list(set([tweet['topic'] for tweet in db.tweets.find()]))

    return topics

# --- get_tweets


def get_tweets(topic):
    tweets = set([tweet['text'] for tweet in db.tweets.find({'topic': topic})])

    return tweets

#--- get words


def get_words(tweets, dictionary):

    # dic is a list of words and their probable following word
    # eg {'the'; [{'cat', 0.4}, {'dog': 0.2}] }

    dic = dict()

    for tweet in tweets:

        text = tweet.lower()
        # print('text: ' + text)

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

        # print(text)

        words = nltk.tokenize.word_tokenize(text)

        # print('words')
        # print(text)
        # pprint(words)

        # init to start of line
        word1 = "^"

        for word in words:
            if word == '.':
                updateWordCount(dic, word1, '$', dictionary)
                word1 = '^'
            else:
                updateWordCount(dic, word1, word, dictionary)
                word1 = word

        # end of line

        if word1 != '^':
            updateWordCount(dic, word1, "$", dictionary)

    # pprint(dic)

    return dic

# valid word


def is_word(word, dictionary):
    return word == '^' or word == '$' or word in dictionary

# update word counts


def updateWordCount(dic, word1, word2, dictionary):

    if is_word(word1, dictionary) and is_word(word2, dictionary):
        if word1 not in dic:
            dic[word1] = collections.Counter()

        dic[word1][word2] += 1


# calc probs

def calc_probs(dic):

    word_probs = dict()

    for word in dic.keys():
        probs = collections.OrderedDict()
        word_followers = dic[word]

        word_probs[word] = probs

        total_followers = sum(word_followers[wc] for wc in word_followers.keys())
        cum_prob = 0

        for word2 in word_followers.keys():
            count = word_followers[word2]
            prob = count / total_followers
            cum_prob = cum_prob + prob
            probs[word2] = cum_prob

    return word_probs

#--- reject possibly sensitive words
# offensive or topics that may randomly end up with a negative sentiment


def is_possibly_sensitive(word):

    return any(re.search(item, word) is not None for item in possibly_sensitive_words)

#--- create title


def create_title(probs):
    title = ''
    tries = 0

    while tries < 1000:
        title = ''
        word1 = '^'
        tries += 1

        while word1 != '$' and word1 in probs and len(title) <= 60:
            followers = probs[word1]
            prob = random.random()

            # pprint(word1)
            # print(prob)
            # pprint(followers)
            # print('------------------------------------------------------')

            for word2 in followers.keys():
                word1 = word2

                if followers[word2] > prob and not is_possibly_sensitive(word2):

                    if word1 != '$':
                        if len(title) > 0:
                            title = title + ' '

                        title = title + word1

                    break

        # short & more than one word
        if len(title) < 60 and ' ' in title:
            break

    return title

#--- run


def run():
    # print('total tweets: ' + str(db.tweets.find().count()))

    # titles to generate per topic
    min_title_count = 100
    max_title_count = 2000

    topics = get_topics()

    # load actual dict
    dictionary = set(line.strip() for line in open('/usr/share/dict/words'))

    for topic in topics:

        titles_found = db.titles.find({'topic': topic}).count()

        if titles_found < min_title_count:
            tweets = get_tweets(topic)

            # dictionary of word bigrams
            dic = get_words(tweets, dictionary)

            # convert counts to probabilities
            probs = calc_probs(dic)

            # create titles
            titles = [create_title(probs) for i in range(0, max_title_count - titles_found)]

            pprint(topic)
            pprint(titles)

            # store

            try:
                items = [{'topic': topic, 'title': title} for title in titles]
                db.titles.insert(items)
            except pymongo.errors.PyMongoError as e:
                print(type(e))
                print(e)

#---

run()
