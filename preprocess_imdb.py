#!/usr/bin/env python3
import gzip
import csv
import json

# --- 1. Load ratings into a dict ----------
ratings = {}
with gzip.open('title.ratings.tsv.gz', 'rt', encoding='utf-8') as rf:
    reader = csv.DictReader(rf, delimiter='\t')
    for row in reader:
        # Keep only the numeric fields we need
        ratings[row['tconst']] = {
            'averageRating': float(row['averageRating']),
            'numVotes':    int(row['numVotes']),
        }

# --- 2. Process title basics and join ------
movies = []
with gzip.open('title.basics.tsv.gz', 'rt', encoding='utf-8') as bf:
    reader = csv.DictReader(bf, delimiter='\t')
    for row in reader:
        # Filter to non-adult feature films
        if row['titleType'] != 'movie' or row['isAdult'] != '0':
            continue

        tconst = row['tconst']
        # Only include if we have a rating for it
        if tconst not in ratings:
            continue

        # Parse year and runtime (some rows have '\N' for missing)
        year = row['startYear']
        runtime = row['runtimeMinutes']
        movies.append({
            'tconst':        tconst,
            'primaryTitle':  row['primaryTitle'],
            'startYear':     int(year)    if year.isdigit()    else None,
            'runtimeMinutes':int(runtime) if runtime.isdigit() else None,
            'averageRating': ratings[tconst]['averageRating'],
            'numVotes':      ratings[tconst]['numVotes'],
        })

# --- 3. Write out compact JSON -------------
with open('movies.json', 'w', encoding='utf-8') as out:
    json.dump(movies, out, ensure_ascii=False)

print(f'✅ Exported {len(movies):,} movie records to movies.json')