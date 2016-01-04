
#!/usr/local/bin/python3

# gets the most frequent useful words

import os
import re
import collections
import nltk

from pprint import pprint

import pymongo
client = pymongo.MongoClient(os.getenv('mongo_functal'))

db = client['topics']


# --- get_tweets


def get_tweets():
    tweets = set([tweet['text'] for tweet in db.tweets.find()])

    return tweets

#--- get words


def get_words(tweets, dictionary):

    # dic is a list of words and their count

    dic = collections.Counter()

    # limit tweets
    #tweets = list(tweets)[0:3000]

    for tweet in tweets:

        text = tweet.lower()

        # remove links
        text = re.sub(r'(https?):\/\/(www\.)?[a-z0-9\.:].*?(?=\s|$)', '', text)

        # remove names
        text = re.sub(r'@[a-z0-9].*?(?=\s|$)', '', text)

        # remove hashtags
        text = re.sub(r'#[a-z0-9].*?(?=\s|$)', '', text)

        # remove special chars
        text = re.sub(r'[!]', '', text)

        # remove entities
        text = re.sub(r'&amp;', 'and', text)
        text = re.sub(r'&.*;', '', text)

        words = nltk.tokenize.WhitespaceTokenizer().tokenize(text)
        words = [re.sub(r"[^a-z0-9']", '', w) for w in words]
        words = [w for w in words if len(w) > 2]
        # pprint(words)

        if len(words) > 0:
            pos = nltk.pos_tag(words)

            # pprint(pos)

            for word in words:
                word_pos = [p[1] for p in pos if p[0] == word][0]
                if not re.match('DT|CC|VBP|IN|TO|PRP|VBD|RB|RP|WP|WRB|MD', word_pos):
                    updateWordCount(dic, word, word_pos, dictionary)

    # pprint(dic)

    return dic

# valid word


def is_word(word, dictionary):

    return word in dictionary

# update word counts


def updateWordCount(dic, word, pos, dictionary):

    if is_word(word, dictionary):
        dic[word] += 1
        #dic[word + ' ' + pos] += 1

#--- run


def run():

    # load actual dict
    dictionary = set(line.strip() for line in open('/usr/share/dict/words'))

    tweets = get_tweets()

    # dictionary of word bigrams
    dic = get_words(tweets, dictionary)

    most_common = dic.most_common()

    for w in most_common:
        print(w[0])


#---

run()
