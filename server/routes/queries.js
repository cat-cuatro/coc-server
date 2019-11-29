const pgp = require('pg-promise')({ noLocking: true });

const config = {
  host: 'localhost',
  port: 54320,
  database: 'coc',
  user: 'coc',
  password: 'pwd123'
};

let db;

function loadDatabaseConnection() {
  if (!db) {
    db = pgp(config);
  }

  return db;
}

function getFaculty(req, res, next) {
  db = loadDatabaseConnection();

  return db
    .one('SELECT * FROM users WHERE first_name= $1', [req.query.firstName])
    .then(data => {
      const user = {
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNum: data.phone_number,
      };
      return res.status(200).send(user);
    })
    .catch(err => {
      console.log(err.message);
      return next(err.message);
    });
}

function getCommittees(req, res, next) {
  db = loadDatabaseConnection();

  return db
    .any('SELECT * FROM all_committees')
    .then(data => {
      return res.status(200).send(data);
    })
    .catch(err => {
      console.log(err.message);
      return next(err.message);
    });
}

function addFaculty(req, res, next) {
  db = loadDatabaseConnection();
  return db
    .none(
      'INSERT INTO users(first_name, last_name, phone_number) values($1, $2, $3)',
      [req.body.firstName, req.body.lastName, req.body.phoneNum]
    )
    .then(() => {
      return res.status(200).send('Data insert was a success');
    })
    .catch(err => {
      console.log(err.message);
      return next(err.message);
    });
}
module.exports = { getFaculty, addFaculty, getCommittees, loadDatabaseConnection };
