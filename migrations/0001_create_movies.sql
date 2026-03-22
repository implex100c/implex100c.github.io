PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS movies (
  tconst TEXT PRIMARY KEY,
  primary_title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  start_year INTEGER,
  average_rating REAL,
  num_votes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS movie_tokens (
  token TEXT NOT NULL,
  tconst TEXT NOT NULL,
  PRIMARY KEY (token, tconst),
  FOREIGN KEY (tconst) REFERENCES movies(tconst) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_movies_normalized_title
  ON movies (normalized_title);

CREATE INDEX IF NOT EXISTS idx_movies_num_votes
  ON movies (num_votes DESC, primary_title ASC, tconst ASC);

CREATE INDEX IF NOT EXISTS idx_movie_tokens_tconst
  ON movie_tokens (tconst);
