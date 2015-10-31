#!/usr/bin/python3

from sentiment import get_sentiment
from pprint import pprint

#--- run


def run():

    text = 'not bad'

    sentiment = get_sentiment(text)

    pprint(sentiment)

#---

run()
