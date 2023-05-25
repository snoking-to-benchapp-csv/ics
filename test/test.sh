#!/bin/bash
wget https://ics.benchapp.com/eyJwbGF5ZXJJZCI6NjMwODYsInRlYW1JZCI6WzIwOTM3OF19 -O DEV.ics
wget https://ics.benchapp.com/eyJwbGF5ZXJJZCI6NjMwODYsInRlYW1JZCI6WzgwNzUzXX0 -O PROD.ics
code --diff DEV.ics PROD.ics
