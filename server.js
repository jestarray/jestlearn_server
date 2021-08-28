var express = require("express");
let PORT = 3000;
var cors = require('cors')
var app = express();
const db = require("better-sqlite3")("save.db", {verbose: console.log});
db.pragma('journal_mode = WAL');

db.prepare(
	`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		date_created INTEGER,
		ip_address TEXT
		);`).run();

db.prepare(
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
		);`).run();

db.prepare(
	`CREATE TABLE IF NOT EXISTS archive (
		title TEXT,
		id INTEGER,
		problem_index INTEGER,
		problems TEXT,
		emoji_mark TEXT,
		last_updated INTEGER,
		user_id INTEGER,
		course_name TEXT
		);`).run();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//todo: maybe jsut merge thi all into jestlearn instead of splitting this up into a seperate project
//since they're both probably going to share the data.ts file which contains the table of contents

//https://github.com/JoshuaWise/better-sqlite3
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});

function get_user_data(username) {
	let find_user = db.prepare(`SELECT id, username, date_created FROM users WHERE username = ?`);
	let data = find_user.get(username);
	return data;
}

function get_all_problem_data(id, course_name) {
	let find_problemset_data = db.prepare(`SELECT * FROM problemset WHERE user_id = ? AND course_name = ?`);
	let fetched = find_problemset_data.all(id, course_name);
	if(fetched !== undefined) {
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
	let insert_problem = db.prepare(`INSERT OR REPLACE INTO problemset (title, id, problem_index, problems, emoji_mark, last_updated, user_id, course_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
	//console.log(problem, user_id);
	for(let item of problem) {
		insert_problem.run(item.title, item.id, item.problem_index, JSON.stringify(item.problems), item.emoji_mark, item.last_updated, user_id, course_name);
	}
}

function archive(problem, user_id, course_name) {
	//todo: check if there are any current problems and resolve the diff via time stamps in another function 
	let insert_problem = db.prepare(`INSERT INTO archive (title, id, problem_index, problems, emoji_mark, last_updated, user_id, course_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
	//console.log(problem, user_id);
	for(let item of problem) {
		insert_problem.run(item.title, item.id, item.problem_index, JSON.stringify(item.problems), item.emoji_mark, item.last_updated, user_id, course_name);
	}
}

//both are type ProblemSet[];
//could be un-even list
//if not even, merge one of them into the other, also depending on who has which of the higher timestamps
function diff_latest(set_a, set_b) {
	let combined = [...set_a, ...set_b];
	let diffmerged = combined.filter((val1, index) => {
		let f = combined.filter((val2, index2) => {
			return index !== index2 && val1.id === val2.id
		});
		if(f.length > 0) {
			return val1.last_updated > f[0].last_updated;
		} else if(f.length === 0) {
			//is unqiue so we keep it?
			return true;
		} else {
			return false;
		}
	});
	let res = diffmerged.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      } else if (a.id > b.id) {
        return 1;
      } else {
        return 0;
      }
    });
	return res;
}

//just call this sync?
app.post('/sync', (req, res) => {
	let query = get_user_data(req.body.username);
	let problems_from_client = req.body.problem_sets;
	console.log(req.body);
	let course_name = req.body.course_name;
	if(query !== undefined) {
		//the user exists so resolve diffs between the sent client data and the server save data based on timestamsp
		//scenarios: when the client is logging in from a completely new device
		//when the client is logging in from the same device and wants to sync updates
		let problems_from_db = get_all_problem_data(query.id, course_name);
		//console.log(problems_from_client);
		let diffed = diff_latest(problems_from_client, problems_from_db);
		if(problems_from_client.length > 0) {
			//console.log(diffed);
			insert_problem_data(diffed, query.id, course_name);
		}
		//doesnt send back data if update only
		const UPDATE_ONLY = 0;
		const INITIAL = 1;
		const ARCHIVE = 2;
		let send = {username:req.body.username, date_created: query.date_created, problems: diffed};
		
		if(req.body.code === UPDATE_ONLY) {
			send.problems = [];
		} else if(req.body.code == ARCHIVE) {
			archive(diffed, query.id, course_name);
			send.problems = [];
		} else if(req.body.code == INITIAL) {
			send.problems = diffed;
		} else {
			send.problems = [];
		}
		res.send(send);
		//console.log(problems_from_client, problems_from_db);
		//diff the client and server save
	} else {
		//first time creating an account!
		let new_user = db.prepare(`INSERT INTO users (username, date_created, ip_address) VALUES (?, ?, ?)`);
		let account_creation_date = Date.now();
		new_user.run(req.body.username, account_creation_date, req.ip);
		let userinfo = get_user_data(req.body.username);
		if(problems_from_client !== undefined) {
			insert_problem_data(problems_from_client, userinfo.id, course_name);
		}
		res.send({username:req.body.username, date_created: account_creation_date, problems: []});
		//new_user.run(req.body.username, "192.168.1.1");
	}
});