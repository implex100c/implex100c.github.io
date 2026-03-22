#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import {
  buildMovieTokens,
  normalizeMovieRecord
} from '../shared/movie-search.js';

const DEFAULT_INPUT = path.resolve('movies.slim.json');
const DEFAULT_DATABASE = process.env.CLOUDFLARE_D1_DATABASE_NAME || 'underrated';
const MOVIE_BATCH_SIZE = 250;
const TOKEN_BATCH_SIZE = 1000;

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    database: DEFAULT_DATABASE,
    execute: true,
    scope: 'local',
    sqlOut: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      args.input = path.resolve(argv[++i]);
    } else if (arg === '--database' && argv[i + 1]) {
      args.database = argv[++i];
    } else if (arg === '--sql-out' && argv[i + 1]) {
      args.sqlOut = path.resolve(argv[++i]);
    } else if (arg === '--remote') {
      args.scope = 'remote';
    } else if (arg === '--local') {
      args.scope = 'local';
    } else if (arg === '--no-execute') {
      args.execute = false;
    }
  }

  return args;
}

function escapeSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function serializeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  return escapeSqlString(value);
}

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function buildInsertStatement(table, columns, rows) {
  const valueList = rows
    .map(row => `(${columns.map(column => serializeSqlValue(row[column])).join(', ')})`)
    .join(',\n');

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${valueList};`;
}

function loadMovies(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing JSON input: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`JSON input is not an array: ${inputPath}`);
  }

  return raw.map(normalizeMovieRecord).filter(Boolean);
}

function buildImportSql(movies) {
  const movieRows = movies.map(movie => ({
    tconst: movie.tconst,
    primary_title: movie.primaryTitle,
    normalized_title: movie.normalizedTitle,
    start_year: movie.startYear,
    average_rating: movie.averageRating,
    num_votes: movie.numVotes
  }));

  const tokenRows = [];
  for (const movie of movies) {
    const tokens = buildMovieTokens(movie.primaryTitle);
    for (const token of tokens) {
      tokenRows.push({
        token,
        tconst: movie.tconst
      });
    }
  }

  const statements = [
    'PRAGMA foreign_keys = ON;',
    'BEGIN TRANSACTION;',
    'DELETE FROM movie_tokens;',
    'DELETE FROM movies;'
  ];

  for (const batch of chunk(movieRows, MOVIE_BATCH_SIZE)) {
    statements.push(
      buildInsertStatement(
        'movies',
        ['tconst', 'primary_title', 'normalized_title', 'start_year', 'average_rating', 'num_votes'],
        batch
      )
    );
  }

  for (const batch of chunk(tokenRows, TOKEN_BATCH_SIZE)) {
    statements.push(
      buildInsertStatement(
        'movie_tokens',
        ['token', 'tconst'],
        batch
      )
    );
  }

  statements.push('COMMIT;');
  return `${statements.join('\n\n')}\n`;
}

function writeSqlFile(sql, requestedPath) {
  const targetPath = requestedPath || path.join(
    os.tmpdir(),
    `underrated-d1-import-${Date.now()}.sql`
  );

  fs.writeFileSync(targetPath, sql);
  return targetPath;
}

function runWrangler(database, scope, filePath) {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', database, `--${scope}`, '--file', filePath],
    {
      stdio: 'inherit'
    }
  );
}

function main() {
  const args = parseArgs(process.argv);
  const movies = loadMovies(args.input);
  const sql = buildImportSql(movies);
  const sqlPath = writeSqlFile(sql, args.sqlOut);

  console.log(`Prepared D1 import SQL for ${movies.length} movies at ${sqlPath}`);

  if (!args.execute) {
    return;
  }

  const migrationPath = path.resolve('migrations/0001_create_movies.sql');
  runWrangler(args.database, args.scope, migrationPath);
  runWrangler(args.database, args.scope, sqlPath);
}

main();
