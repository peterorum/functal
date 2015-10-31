#!/usr/bin/python3

import json
import urllib.request
import urllib.parse
from pprint import pprint

#--- run


def run():

    sentimentUrl = 'https://japerk-text-processing.p.mashape.com/sentiment/'

    text = {
        "language": "english",
        "text": "a lovely spiral"
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

    pprint(sentiment['label'])
#---

run()
