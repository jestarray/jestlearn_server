require("dotenv").config();
var express = require("express");
let PORT = process.env.PORT || 3000;
var cors = require("cors");
var app = express();
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const db = new DatabaseSync(process.env.DB_FILE || "save.db");
db.exec("PRAGMA journal_mode = WAL;");

// node:sqlite only binds null, number, bigint, string and Uint8Array, and throws on
// undefined. better-sqlite3 bound undefined as NULL, so normalise missing values to
// null here to keep the same behaviour for optional fields such as course_name.
function prepare(sql) {
  const statement = db.prepare(sql);
  const bind = (method) => (...params) =>
    method.apply(
      statement,
      params.map((param) => (param === undefined ? null : param))
    );
  return {
    run: bind(statement.run),
    get: bind(statement.get),
    all: bind(statement.all),
  };
}

db.exec(
  `CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		date_created INTEGER
		);`
);

db.exec(
  `CREATE TABLE IF NOT EXISTS problemset (
		title TEXT,
		id INTEGER,
		problem_index INTEGER,
		problems TEXT,
		emoji_mark TEXT,
		last_updated INTEGER,
		user_id INTEGER,
		course_name TEXT,
		UNIQUE(id, user_id) ON CONFLICT REPLACE
		);`
);

db.exec(
  `CREATE TABLE IF NOT EXISTS archive (
		title TEXT,
		id INTEGER,
		problem_index INTEGER,
		problems TEXT,
		emoji_mark TEXT,
		last_updated INTEGER,
		user_id INTEGER,
		course_name TEXT
		);`
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//todo: maybe jsut merge thi all into jestlearn instead of splitting this up into a seperate project
//since they're both probably going to share the data.ts file which contains the table of contents

//https://nodejs.org/api/sqlite.html
//express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead of
//throwing them, so handle them explicitly.
app.listen(PORT, (error) => {
  if (error) {
    console.error(`Failed to start server on port ${PORT}:`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Server running on port ${PORT}`);
});

function get_user_data(username) {
  let find_user = prepare(
    `SELECT id, username, date_created FROM users WHERE username = ?`
  );
  let data = find_user.get(username);
  return data;
}

function get_all_problem_data(id, course_name) {
  let find_problemset_data = prepare(
    `SELECT * FROM problemset WHERE user_id = ? AND course_name = ?`
  );
  let fetched = find_problemset_data.all(id, course_name);
  if (fetched !== undefined) {
    fetched = fetched.map((prob) => {
      prob.problems = JSON.parse(prob.problems);
      return prob;
    });
  }
  return fetched;
}

//problem is [ProblemSet]}
function insert_problem_data(problem, user_id, course_name) {
  //todo: check if there are any current problems and resolve the diff via time stamps in another function
  let insert_problem = prepare(
    `INSERT OR REPLACE INTO problemset (title, id, problem_index, problems, emoji_mark, last_updated, user_id, course_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  //console.log(problem, user_id);
  for (let item of problem) {
    insert_problem.run(
      item.title,
      item.id,
      item.problem_index,
      JSON.stringify(item.problems),
      item.emoji_mark,
      item.last_updated,
      user_id,
      course_name
    );
  }
}

function archive(problem, user_id, course_name) {
  //todo: check if there are any current problems and resolve the diff via time stamps in another function
  let insert_problem = prepare(
    `INSERT INTO archive (title, id, problem_index, problems, emoji_mark, last_updated, user_id, course_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let item of problem) {
    insert_problem.run(
      item.title,
      item.id,
      item.problem_index,
      JSON.stringify(item.problems),
      item.emoji_mark,
      item.last_updated,
      user_id,
      course_name
    );
  }
}

//both are type ProblemSet[];
//could be un-even list
//if not even, merge one of them into the other, also depending on who has which of the higher timestamps
function diff_latest(set_a, set_b) {
  let bigger = set_a;
  let smaller = set_b;
  if (set_a.length < set_b.length) {
    bigger = set_b;
    smaller = set_a;
  }
  //merge the unique ones that the other doesnt have
  for (const item of smaller) {
    let is_unique = true;
    for (const item2 of bigger) {
      if (item.title === item2.title) {
        is_unique = false;
        break;
      }
    }
    if (is_unique) {
      bigger.push(item);
    }
  }
  //diffing
  let diffed = bigger.map((val) => {
    let keep = val;
    for (const val2 of smaller) {
      if (val.id == val2.id && val.last_updated < val2.last_updated) {
        keep = val2;
        break;
      }
    }
    return keep;
  });
  return diffed;
}

app.post("/sync", (req, res) => {
  //express 5 leaves req.body undefined when no body was parsed (express 4 used
  //{}), and a parsed-but-empty body still has no username. Without this check the
  //first-time-account branch below would insert a user with a null username.
  if (req.body === undefined || req.body.username === undefined || req.body.username === null) {
    res.status(400).send({ error: "username is required." });
    return;
  }
  let query = get_user_data(req.body.username);
  let problems_from_client = req.body.problem_sets;
  //console.log(req.body);
  let course_name = req.body.course_name;
  if (query !== undefined) {
    //the user exists so resolve diffs between the sent client data and the server save data based on timestamsp
    //scenarios: when the client is logging in from a completely new device
    //when the client is logging in from the same device and wants to sync updates
    let problems_from_db = get_all_problem_data(query.id, course_name);
    //console.log(problems_from_client);
    let diffed = diff_latest(problems_from_client, problems_from_db);
    if (problems_from_client.length > 0) {
      //console.log(diffed);
      insert_problem_data(diffed, query.id, course_name);
    }
    //doesnt send back data if update only
    const UPDATE_ONLY = 0;
    const INITIAL = 1;
    const ARCHIVE = 2;
    let send = {
      username: req.body.username,
      date_created: query.date_created,
      problems: diffed,
    };

    if (req.body.code === UPDATE_ONLY) {
      send.problems = [];
    } else if (req.body.code == ARCHIVE) {
      archive(diffed, query.id, course_name);
      send.problems = [];
    } else if (req.body.code == INITIAL) {
      send.problems = diffed;
    } else {
      send.problems = [];
    }
    res.send(send);
    //console.log(problems_from_client, problems_from_db);
    //diff the client and server save
  } else {
    //first time creating an account!
    let new_user = prepare(
      `INSERT INTO users (username, date_created) VALUES (?, ?)`
    );
    let account_creation_date = Date.now();
    new_user.run(req.body.username, account_creation_date);
    let userinfo = get_user_data(req.body.username);
    if (problems_from_client !== undefined) {
      insert_problem_data(problems_from_client, userinfo.id, course_name);
    }
    res.send({
      username: req.body.username,
      date_created: account_creation_date,
      problems: [],
    });
    //new_user.run(req.body.username, "192.168.1.1");
  }
});

///replace spaces with underscores and lower cases the name
function convert_to_hash(st) {
  let regex = / /gi;
  let replace_spaces = st.replace(regex, "_");
  let res = replace_spaces.toLowerCase();
  return res;
}
//all we need is the built course folders and some unused rootpath
//note: root dir must be synced with the jestlearn COURSE_NAME
let courses_on_this_site = [
  { path: "./jestlearn/dist", course_name: "Example Course" },
  { path: "./computer_systems_public", course_name: "Computer Systems" },
  { path: "./howtocode", course_name: "how to code" },
];

let hosted = courses_on_this_site.map((val) => {
  //host the courses on their respective root paths
  app.use(`/${convert_to_hash(val.course_name)}`, express.static(val.path));
  //relative href so the index works on whatever host served it (localhost, a
  //staging domain, jestlearn.com) instead of always advertising the prod domain
  return `<li><a href="/${convert_to_hash(val.course_name)}/">${
    val.course_name
  }</a></li>`;
});

//howtocode is a generated artifact, not committed source: a fresh clone (or a
//deploy where the publish step did not run) would otherwise just 404 silently.
for (const val of courses_on_this_site) {
  if (!fs.existsSync(val.path)) {
    console.warn(
      `warning: course "${val.course_name}" has no build at ${val.path} - ` +
        `run "npm run build:howtocode" to generate it`
    );
  }
}

async function get_exercise(id = 0, amount = 1) {
  const { stdout } = await execFile("./gen_exercises", [
    `--exercise`,
    `${id}`,
    `--amount`,
    amount,
  ]);
  let parsed = JSON.parse(stdout);
  return parsed;
}

app.use("/exercise", async function p(req, res) {
  let params = req.body;
  let id = 0;
  let amount = 1;
  if (params) {
    if (params.id) {
      id = params.id;
    }
    if (params.amount) {
      amount = params.amount;
    }
  }
  let result = await get_exercise(id, amount);
  res.send(JSON.stringify(result));
});

//order matters! do not put this .use() on top as it will match first, instead we want this to map last for a given url
app.use("/", (req, res) => {
  //list all courses on this website and include the source
  //https://github.com/jestarray/jestlearn
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "94ff6f49ae794e9fb35547e18ce0d8de"}'></script><!-- End Cloudflare Web Analytics -->
    <title>jestlearn courses</title>
</head>
<body>
	<h1>Courses on this site: </h1>
    <ul>
	${hosted.reduce((prev, curr) => prev + curr)}
	</ul>
	<a href="https://github.com/jestarray/jestlearn">Source Code</a>
</body>
</html>`);
});
