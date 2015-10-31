#!/usr/bin/python3

import json
import urllib.request
import urllib.parse
from pprint import pprint


def get_sentiment(text):

    # returns neg, pos or neutral

    #sentimentUrl = 'https://japerk-text-processing.p.mashape.com/sentiment/'

    # text = {
    #    "language": "english",
    #    "text": text
    #}

    #-----------

    #{'result': {'confidence': '62.5106', 'sentiment': 'Positive'}}

    sentimentUrl = 'https://community-sentiment.p.mashape.com/text/'

    # todo: use batch http://sentiment.vivekn.com/docs/api/, http://sentiment.vivekn.com/api/batch/

    text = {
        "txt": text
    }

    data = urllib.parse.urlencode(text)
    data = data.encode('utf-8')

    headers = {
        "X-Mashape-Key": os.getenv('mashape'),
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }

    # post

    req = urllib.request.Request(sentimentUrl, data=data, headers=headers)

    response = urllib.request.urlopen(req)

    sentiment = json.loads(response.read().decode('utf-8'))

    pprint(sentiment)

    return sentiment['result']['sentiment'].lower()
