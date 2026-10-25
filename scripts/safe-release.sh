#!/bin/bash
# Safe OTA release — verify before shipping, so a bad bundle never reaches users.
#
#   bash scripts/safe-release.sh "your release message"
#
# Nothing is published unless every check passes. Your uncommitted work is
# always restored, and Ctrl+C aborts cleanly at any point.

set -u
cd "$(dirname "$0")/.." || exit 1
MSG="${1:-}"
[ -z "$MSG" ] && { echo "Usage: bash scripts/safe-release.sh \"release message\""; exit 1; }

RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; OFF=$'\e[0m'
ok(){  echo "${GRN}  OK${OFF}   $1"; }
bad(){ echo "${RED}  FAIL${OFF} $1"; exit 1; }
inf(){ echo "${YLW}==>${OFF} $1"; }

# ---------- 1. runtimeVersion at rest ----------
inf "1/5  runtimeVersion check"
RV=$(grep -o '"runtimeVersion": *"[^"]*"' app.json | head -1 | sed 's/.*"\([0-9.]*\)"$/\1/')
[ "$RV" = "1.0.8" ] || bad "runtimeVersion is $RV, expected 1.0.8 — fix app.json (a previous run may have aborted)"
ok "runtimeVersion = 1.0.8"

# ---------- 2. payment files must never change ----------
inf "2/5  payment files untouched"
PAY=$(git status --porcelain src/screens/main/Payment.tsx src/screens/main/Plans.tsx 2>/dev/null)
[ -z "$PAY" ] || bad "Payment.tsx/Plans.tsx modified — these must never change:
$PAY"
ok "Payment.tsx and Plans.tsx clean"

# ---------- 3. secrets (tracked diff + untracked files) ----------
inf "3/5  secrets scan"
SECRET_RE='(rzp_live|sk_live|AIza[0-9A-Za-z_-]{20}|merchant_?salt|smtp_?password|BEGIN [A-Z ]*PRIVATE KEY)'
HITS=$( { git diff HEAD -- . ':(exclude)*.lock' ':(exclude)package-lock.json' | grep -E '^\+' | grep -vE '^\+\+\+'
          git ls-files --others --exclude-standard -z 2>/dev/null \
            | grep -zv '^scripts/safe-release\.sh$' \
            | xargs -0 -r grep -nHE "$SECRET_RE" 2>/dev/null
        } | grep -iE "$SECRET_RE" | head -5)
[ -z "$HITS" ] || bad "possible secret found — do not ship:
$HITS"
ok "no secrets found"

# ---------- 4. no NEW TypeScript errors vs last commit ----------
inf "4/5  TypeScript (comparing against last commit)"
count_ts(){
  local out rc cnt
  out=$(npx tsc --noEmit 2>&1); rc=$?
  cnt=$(printf '%s' "$out" | grep -c "error TS")
  # tsc exits 0 when clean, 2 when it found type errors. Anything else
  # (out of memory, missing binary, killed) means the check did not really run.
  if [ "$rc" -gt 2 ] || { [ "$rc" != "0" ] && [ "$cnt" = "0" ]; }; then echo "TSC_BROKEN"; return; fi
  echo "$cnt"
}
NOW=$(count_ts)
[ "$NOW" = "TSC_BROKEN" ] && bad "tsc could not run — cannot verify TypeScript"

STASH=0
restore_stash(){
  if [ "$STASH" = "1" ]; then
    if git stash pop -q 2>/dev/null; then STASH=0
    else echo "${RED}  CRITICAL: your work is still saved in git stash — run: git stash pop${OFF}"; fi
  fi
}
on_signal(){ restore_stash; echo "${RED}  aborted — nothing was published${OFF}"; exit 130; }
trap restore_stash EXIT
trap on_signal INT TERM
if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -q -m safe-release-base || bad "could not stash your work for the baseline check"
  STASH=1
fi
BASE=$(count_ts)
restore_stash
[ "$STASH" = "1" ] && bad "could not restore your stashed work — run 'git stash pop' manually. NOTHING was published."
trap - EXIT INT TERM
[ "$BASE" = "TSC_BROKEN" ] && bad "tsc could not run on baseline — cannot verify TypeScript"

if [ "$NOW" -gt "$BASE" ]; then
  echo "${RED}  new TypeScript errors introduced:${OFF}"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10
  bad "errors went from $BASE to $NOW"
fi
ok "no new TS errors ($NOW total, baseline $BASE)"

# Hard rule, independent of the baseline: a reference to a name or module
# that does not exist crashes the app at runtime ("ReferenceError: Property
# 'x' doesn't exist") the moment that screen opens. tsc reports these as
# TS2304/TS2552/TS2551 (undefined name) and TS2307 (missing module).
FATAL=$(npx tsc --noEmit 2>&1 | grep -E "error (TS2304|TS2552|TS2551|TS2307|TS2305|TS2614|TS2724|TS2503|TS2448|TS2449|TS2454|TS2300|TS2451|TS2392|TS2395|TS2693|TS2686|TS2749|TS1005|TS1109|TS1128|TS1003|TS17008|TS2657|TS2741):" | grep -v "src/tests/" | head -10)
[ -z "$FATAL" ] || bad "undefined name / bad import / syntax error (this crashes the app at runtime):
$FATAL"
ok "no undefined names, bad imports or syntax errors"

# ---------- 5. bundle must build ----------
inf "5/5  bundle export"
rm -rf .release-check
npx expo export --output-dir .release-check --platform all >/dev/null 2>&1; EXPORT_RC=$?
rm -rf .release-check
[ "$EXPORT_RC" = "0" ] || bad "bundle export failed — app would crash on launch"
ok "bundle exports cleanly"

# ---------- publish ----------
PREV=$(npx eas update:list --branch production --non-interactive 2>/dev/null \
       | grep -E "Runtime Version|Group ID" | paste - - | awk '{print $3" -> "$6}' | head -3)
echo
inf "All checks passed. Publishing..."

FAILED=0
restore_rv(){ sed -i -E 's/"runtimeVersion": "1.0.[67]"/"runtimeVersion": "1.0.8"/' app.json; }
on_signal_rv(){ restore_rv; echo "${RED}  aborted during publish — rerun the script${OFF}"; exit 130; }
trap restore_rv EXIT
trap on_signal_rv INT TERM
# 1.0.8 = builds with the new native modules (versionCode 26+); 1.0.7 = iOS /
# preview builds; 1.0.6 = older Android store builds. Publish to all so every
# installed build keeps receiving fixes. JS that uses a module only present in
# 1.0.8 builds must be guarded (try/require) until older runtimes are retired.
for RUNTIME in 1.0.8 1.0.7 1.0.6; do
  sed -i -E "s/\"runtimeVersion\": \"1.0.[678]\"/\"runtimeVersion\": \"$RUNTIME\"/" app.json
  grep -q "\"runtimeVersion\": \"$RUNTIME\"" app.json || bad "could not switch runtimeVersion to $RUNTIME"
  for BRANCH in production preview; do
    echo "    -> $BRANCH @ $RUNTIME"
    npx eas update --branch "$BRANCH" --message "$MSG ($RUNTIME)" --non-interactive \
      || { echo "${RED}    publish FAILED: $BRANCH @ $RUNTIME${OFF}"; FAILED=1; }
  done
done
restore_rv
trap - EXIT INT TERM
grep -q '"runtimeVersion": "1.0.8"' app.json || bad "runtimeVersion NOT restored — fix app.json by hand"
ok "runtimeVersion restored to 1.0.8"

echo
if [ "$FAILED" = "1" ]; then
  bad "one or more publishes failed — users may have a partial release. Rerun this script."
fi
# Keep git identical to what is live. Fixes that ship over-the-air but are never
# committed get lost: the next store build is made from git and brings back old
# bugs (this is how a fixed crash reappeared on a freshly installed phone).
# New files under src/, assets/ and plugins/ are part of the bundle too, so they
# are committed as well (a new component once shipped live but stayed out of git).
if [ -n "$(git status --porcelain --untracked-files=no)" ] || [ -n "$(git status --porcelain -- src assets plugins)" ]; then
  if git add -u && git add -A -- src assets plugins && git commit -q -m "release: $MSG" -m "Shipped via EAS OTA on runtimes 1.0.8, 1.0.7 and 1.0.6."; then
    echo "${GRN}  OK${OFF}   committed to git: $(git log -1 --format=%h)"
  else echo "${RED}  WARNING: could not commit — run git add/commit yourself so git matches what is live${OFF}"; fi
  echo "${YLW}  Run: git push origin main${OFF}   (so GitHub matches production)"
fi
echo "${GRN}Released:${OFF} $MSG"
echo "Users get it on next app restart."
if [ -n "$PREV" ]; then
  echo "${YLW}Rollback (previous versions, run per runtime):${OFF}"
  echo "$PREV" | while read -r L; do echo "    $L   ->   npx eas update:republish --group ${L##* }"; done
fi
