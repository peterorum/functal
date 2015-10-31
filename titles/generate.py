#!/usr/bin/python3

#from nltk.parse.generate import generate, demo_grammar
#from nltk import CFG

#grammar = CFG.fromstring(demo_grammar)
# print(grammar)

# for sentence in generate(grammar, n=10):
#    print(' '.join(sentence))

# for sentence in generate(grammar, depth=6):
#    print(' '.join(sentence))

#------------------------

# NOT SUPPORTED IN NLTK 3

import nltk

from nltk.model import NgramModel

tokenizer = nltk.tokenize.RegexpTokenizer(r'\w+|[^\w\s]+')


articles = ['With just one print which you send to a street photographer, you can make a difference.',
            'There are two types of programmers in the world; those who put commas at the end of key/value pairs.']

content_text = ' '.join(article for article in articles)

tokenized_content = tokenizer.tokenize(content_text)

content_model = NgramModel(3, tokenized_content)

starting_words = content_model.generate(100)[-2:]

content = content_model.generate(words_to_generate, starting_words)

print(' '.join(content))
