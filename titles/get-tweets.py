#!/usr/local/bin/python3

import os
import random
import time
# import re
import sys
import getopt
import urllib
# import json
from pprint import pprint
from datetime import datetime

import twitter

# import pudb
# pu.db

import pymongo

client = pymongo.MongoClient(os.getenv('mongo_functal'))

db = client['topics']

tweets_to_keep = 100000


def purge_tweets(topic):
    print('purge topic : ' + topic)

    try:
        tweets_found = db.tweets.find({'topic': topic}).count()

        print("found {}".format(tweets_found))

        if tweets_found > tweets_to_keep:
            tweets_to_purge = list(db.tweets.find({'topic': topic}, {"_id": -1}).sort(
                [("_id", -1)]).skip(tweets_to_keep))

            tweets_to_purge = [t["_id"] for t in tweets_to_purge]

            db.tweets.remove({"_id": {"$in": tweets_to_purge}})

    except urllib.error.URLError as e:
        print(e)

# --- get_tweets


def get_tweets(topic):
    # print('topic : ' + topic)

    try:
        # todo - use since_id as max id from db for topic
        search_results = twit.search.tweets(q=topic, lang='en', result_type='mixed', count=100)
        # print('search_results')
        # pprint(search_results)

        # 'user': tweet['user']['name']
        texts = [{'_id': tweet['id_str'], 'text': tweet['text'], 'topic': topic}
                 for tweet in search_results['statuses'] if topic in tweet['text'] and db.tweets.find({'_id': tweet['id_str']}).count() == 0]

        if len(texts) > 0:
                # pprint(texts)

                # store
            try:
                result = db.tweets.insert(texts, {'ordered': False})
                print(str(len(result)) + ' tweets inserted')
            except pymongo.errors.PyMongoError as e:
                print(type(e))
                print(e)
        # else:
            # print('no new tweets')

    except urllib.error.URLError as e:
        print(e)


#--- global

auth = twitter.oauth.OAuth(os.environ['token'], os.environ['token_secret'], os.environ[
    'consumer_key'], os.environ['consumer_secret'])
twit = twitter.Twitter(auth=auth)

#--- main


def main(argv):

    opts, _ = getopt.getopt(argv, "ht:", ["help", "topic="])

    topic = None

    for opt, arg in opts:
        if opt == '-h':
            print('get-tweets -t topic')
            client.close()
            sys.exit()
        elif opt in ("-t", "--topic"):
            topic = arg
            print('topic arg: ' + topic)

    topics = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'cyan', 'magenta', 'turquoise', 'jade', 'violet', 'crimson', 'ruby', 'pink',
              'triangle', 'square', 'circle', 'arrow', 'asterisk', 'wavy', 'star', 'sky', 'target', 'silver',
              'sunset', 'gold', 'golden', 'angle', 'night', 'light', 'storm', 'sunshine', 'fire', 'solar', 'flame',
              'grid', 'spiral', 'curve', 'spider', 'watch', 'swarm', 'collapse', 'crash', 'collide', 'spray', 'swirl', 'chaos', 'chaotic', 'random', 'ocean', 'map', 'paradise',
              'universe', 'weather']
    try:
        # try random.choice(topics)

        if topic is None:
            topic = topics[random.randint(0, len(topics) - 1)]

        print(str(datetime.now()) + ' ' + topic)
        purge_tweets(topic)
        get_tweets(topic)
    except Exception as e:
        print(type(e))
        print(e)
    finally:
        client.close()

#--- run

main(sys.argv[1:])
