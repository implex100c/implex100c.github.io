# Guilty Pleasure Movie - Manual QA Checklist

## 1) Startup / Load
- Open `index.html` via local server.
- Confirm `Search` is disabled before `movies.slim.json` finishes loading.
- Confirm `Search` becomes enabled once data is loaded.
- Simulate missing `movies.slim.json` and confirm error text appears and `Search` stays disabled.

## 2) Lobby
- Set player count to `1`: confirm `Start Game` is disabled.
- Set player count to `2+`: confirm `Start Game` is enabled.
- Enter names, increase/decrease player count, confirm existing values are preserved where possible.
- Use duplicate names for two players and confirm later results still show one row per player.

## 3) Movie Entry
- Leave title blank and press `Search`: confirm no action.
- Enter valid query and confirm max 10 rows shown.
- Confirm `Confirm` stays disabled until one radio choice is selected.
- Confirm each click of `Confirm` advances exactly one player prompt.

## 4) Quiz
- Confirm year/rating render as values or `N/A` without crashes.
- Toggle checkboxes and click `Next`; confirm values persist for that current entry.
- Confirm final `Next` transitions once to Results.

## 5) Results
- Confirm every player appears exactly once.
- Confirm score equals `correctYear + correctRating`.
- Confirm sort is ascending by rating and handles missing rating safely.
- Click `Restart Game` and confirm clean lobby reset with no stale game state.
