const {
  loadDatabaseConnection,
  committee,
  faculty,
  reports,
} = require('./connection');

/**
 * Adds a committee to the database.
 *
 * @param name                Name of the committee (Required)
 * @param description         Description of the committee
 * @param slots               Number of total available slots
 * @returns {Promise}         Query response on success, error on failure
 */
async function addCommittee(name, description, slots) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'INSERT INTO committee(name, description, total_slots) VALUES($1, $2, $3) RETURNING committee_id as "committeeId"',
    [name, description, slots]
  );
}

/**
 * Adds a committee assignment to the database.
 *
 * @param email               Email of committee member
 * @param committeeId         Id of the committee
 * @param startDate           Start date for the committee member
 * @param endDate             End date for the committee member
 * @returns {Promise}         Query response on success, error on failure
 */
async function addCommitteeAssignment(email, committeeId, startDate, endDate) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'INSERT INTO committee_assignment(email, committee_id, start_date, end_date) VALUES($1, $2, $3, $4) RETURNING email',
    [email, committeeId, startDate, endDate]
  );
}

/**
 * Adds committee slots to the database.
 *
 * @param committeeId         Committee id to add slots to
 * @param senateDivision      The senate division
 * @param slotRequirements    The number of slots this committee has
 * @returns {Promise}         Query response on success, error on failure
 */
async function addCommitteeSlots(committeeId, senateDivision, slotRequirements) {
  const connection = loadDatabaseConnection();

  return connection.tx(t => {
    return t.batch([
      t.one(
        'INSERT INTO committee_slots(committee_id, senate_division_short_name, slot_requirements) VALUES($1, $2, $3) RETURNING committee_id as "committeeId"',
        [committeeId, senateDivision, slotRequirements]
      ),
      t.result(
        'UPDATE committee SET total_slots = (total_slots +$2) WHERE committee_id=$1',
        [committeeId, slotRequirements]
      ),
    ]);
  });
}

/**
 * Adds a department association to the database.
 *
 * @param email               Email of committee member
 * @param department_id         Id of the department
 * @returns {Promise}         Query response on success, error on failure
 */
async function addDepartmentAssociation(email, departmentId) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'INSERT INTO department_associations(email, department_id) VALUES($1, $2) RETURNING email',
    [email, departmentId]
  );
}

/**
 * Adds a faculty member to the database. The json can include department associations or not.
 * If the department associations is not an array or is empty, a transaction is run for just the
 * faculty member. If the array does exist, a transaction is made to the both the faculty and
 * department associations tables. pgp.helpers.insert it used to basically concatenate the array
 * of department ids into a single insert statment.
 *
 * @param fullName                Name of the faculty member
 * @param email                   Email of the faculty member
 * @param jobTitle                Job title of the faculty member
 * @param phoneNum                Phone number of faculty member
 * @param senateDivision          Senate division the faculty member belongs to
 * @param departmentAssociations  Array of department ids to associate the faculty member to
 * @returns {Promise}             Query response on success, error on failure
 */
async function addFaculty(
  fullName,
  email,
  jobTitle,
  phoneNum,
  senateDivision,
  departmentAssociations
) {
  const connection = loadDatabaseConnection();
  const pgp = connection.$config.pgp;

  if (Array.isArray(departmentAssociations) && departmentAssociations.length) {
    const departmentAssociationsWithEmail = departmentAssociations.map(e => {
      return e.value === undefined ? { ...e, email: email } : e;
    });
    return connection.tx(t => {
      return t.batch([
        t.one(
          'INSERT INTO faculty(full_name, email, job_title, phone_num, senate_division_short_name) VALUES($1, $2, $3, $4, $5) RETURNING email',
          [fullName, email, jobTitle, phoneNum, senateDivision]
        ),
        t.any(
          pgp.helpers.insert(
            departmentAssociationsWithEmail,
            ['email', 'department_id'],
            'department_associations'
          )
        ),
      ]);
    });
  } else {
    return connection.tx(() => {
      return connection.one(
        'INSERT INTO faculty(full_name, email, job_title, phone_num, senate_division_short_name) VALUES($1, $2, $3, $4, $5) RETURNING email',
        [fullName, email, jobTitle, phoneNum, senateDivision]
      );
    });
  }
}

/**
 * Adds a survey choice to the database.
 *
 * @param choiceId      Choice id
 * @param surveyDate    Date of the survey
 * @param email         Email of the faculty member
 * @param committeeId   Committee id
 * @returns {Promise}   Query response on success, error on failure
 */
async function addSurveyChoice(choiceId, surveyDate, email, committeeId) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'INSERT INTO survey_choice(choice_id, survey_date, email, committee_id) VALUES($1, $2, $3, $4) RETURNING EXTRACT(year FROM "survey_date") as year, email',
    [choiceId, surveyDate, email, committeeId]
  );
}

/**
 * Adds a survey choice to the database.
 *
 * @param surveyDate    Date of the survey
 * @param email         Email of the faculty member
 * @param interested    Bool if the are interested in serving
 * @param expertise     Description of expertise
 * @returns {Promise}   Query response on success, error on failure
 */
async function addSurveyData(surveyDate, email, interested, expertise) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'INSERT INTO survey_data(survey_date, email, is_interested, expertise) VALUES($1, $2, $3, $4) RETURNING EXTRACT(year FROM "survey_date") as year, email',
    [surveyDate, email, interested, expertise]
  );
}

/**
 * Deletes a committee assignment by their id and email.
 *
 * @param id          Unique id of the committee assignment
 * @param email       Email of the faculty member
 * @returns {Promise} Query response on success, error on failure
 */
async function deleteCommitteeAssignment(id, email) {
  const connection = loadDatabaseConnection();

  return connection.result(
    'DELETE FROM committee_assignment WHERE committee_id = $1 AND email = $2',
    [id, email]
  );
}

/**
 * Deletes a senate division slot requirement from a committee committee_id and senate_division_short_name.
 *
 * @param committee_id                Unique id of the committee
 * @param senate_division_short_name  Short name of senate division
 * @returns {Promise}  Query response on success, error on failure
 */
async function deleteSlotRequirement(committee_id, senate_division_short_name) {
  const connection = loadDatabaseConnection();

  return connection.result(
    'DELETE FROM committee_slots WHERE committee_id = $1 AND senate_division_short_name = $2',
    [committee_id, senate_division_short_name]
  );
}

/**
 * Gets all faculty members.
 * @returns {Promise} Query response on success, error on failure
 */
async function getAllFaculty() {
  const connection = loadDatabaseConnection();
  return connection.any(
    'SELECT email,full_name,phone_num,job_title,senate_division_short_name FROM Faculty ORDER BY full_name ASC'
  );
}

/**
 * Gets committee record by its id.
 *
 * @param id     Committee id
 * @returns {Promise} Query response object on success, error on failure
 */
async function getCommittee(id) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'SELECT committee_id, name, description, total_slots FROM committee WHERE committee_id=$1',
    [id]
  );
}

/**
 * Gets committee assignment records by their committee id.
 *
 * @param id          Committee id
 * @returns {Promise} Query response object on success, error on failure
 */
async function getCommitteeAssignmentByCommittee(id) {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT email, committee_id, start_date, end_date FROM committee_assignment WHERE committee_id=$1',
    [id]
  );
}

/**
 * Gets committee assignment records by their faculty email.
 *
 * @param email       Faculty email
 * @returns {Promise} Query response object on success, error on failure
 */
async function getCommitteeAssignmentByFaculty(email) {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT email, committee_id, start_date, end_date FROM committee_assignment WHERE email=$1',
    [email]
  );
}

/**
 * Gets a committee and all associated information to be displayed on the front end committee component.
 * Tables involved in this query are:
 *    faculty,department__associations,committee,committee_assignment
 *
 * @param id          Id of the committee
 * @returns {Promise}    Query response on success, error on failure
 */
async function getCommitteeInfo(id) {
  const connection = loadDatabaseConnection();
  const query = committee.info;
  return connection.oneOrNone(query, [id], committeeInfo => {
    if (committeeInfo) {
      return committeeInfo.json_build_object;
    } else {
      return null;
    }
  });
}

/**
 * Gets committee slot records by their id.
 *
 * @param id          Committee id
 * @returns {Promise} Query response object on success, error on failure
 */
async function getCommitteeSlotsByCommittee(id) {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT senate_division_short_name, slot_requirements FROM committee_slots where committee_id=$1',
    [id]
  );
}

/**
 * Gets committee slot records by their senate division.
 *
 * @param senateDivision  Committee senate division
 * @returns {Promise}     Query response object on success, error on failure
 */
async function getCommitteeSlotsBySenate(senateDivision) {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT committee_id, slot_requirements FROM committee_slots where senate_division_short_name=$1',
    [senateDivision]
  );
}

/**
 * Gets committee records.
 *
 * @returns {Promise} Query response object on success, error on failure
 */
async function getCommittees() {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT committee_id, name, description, total_slots FROM committee ORDER BY name'
  );
}

/**
 * Gets department record by its id.
 *
 * @param id          Department id
 * @returns {Promise} Query response object on success, error on failure
 */
async function getDepartment(id) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'SELECT department_id, name, description FROM department WHERE department_id=$1',
    [id]
  );
}

/**
 * Gets department association records by department id.
 *
 * @param id            Department id
 * @returns {Promise}   Query response object on success, error on failure
 */
async function getDepartmentAssociationsByDepartment(id) {
  const connection = loadDatabaseConnection();

  const result = await connection.any(
    'SELECT email, department_id FROM department_associations WHERE department_id=$1',
    [id]
  );

  return groupDepartmentFacultyById(result);
}

/**
 *
 * @param email         Email of the faculty member
 * @returns {Promise}   Query response object on success, error on failure
 */
async function getDepartmentAssociationsByFaculty(email) {
  const connection = loadDatabaseConnection();

  const result = await connection.any(
    'SELECT email, department_id FROM department_associations WHERE email=$1',
    [email]
  );

  return groupDepartmentIdByFaculty(result);
}

/**
 * Gets department records.
 *
 * @returns {Promise} Query response object on success, error on failure
 */
async function getDepartments() {
  const connection = loadDatabaseConnection();

  return connection.any('SELECT department_id, name, description FROM department');
}

/**
 * Gets a specific faculty record by email.
 *
 * @param email          Email of the faculty member
 * @returns {Promise}    Query response object on success, error on failure
 */
async function getFaculty(email) {
  const connection = loadDatabaseConnection();

  return connection.oneOrNone(
    'SELECT email,full_name,phone_num,job_title,senate_division_short_name FROM faculty WHERE email=$1',
    [email]
  );
}

/**
 * Gets a faculty member and all associated information to be displayed on the front end faculty component.
 * Tables involved in this query are:
 *    faculty,department__associations,department,survey_data,survey_choice,committee,committee_assignment
 *
 * @param email          Email of the faculty member
 * @returns {Promise}    Query response on success, error on failure
 */
async function getFacultyInfo(email) {
  const connection = loadDatabaseConnection();
  const query = faculty.info;
  return connection.oneOrNone(query, [email], facultyInfo => {
    if (facultyInfo) {
      return facultyInfo.json_build_object;
    } else {
      return null;
    }
  });
}

/**
 * Group array of department associations results by id, creating a key-value
 * pair where the value is a list of faculty emails.
 *
 * @param arr     The array to group
 * @returns {*}   The object with the department id and list of user emails
 */
function groupDepartmentFacultyById(arr) {
  return arr.reduce((acc, cur) => {
    const exists = acc.department_id === cur.department_id;

    if (!exists) {
      return { department_id: cur.department_id, emails: [cur.email] };
    }

    acc.emails.push(cur.email);
    return acc;
  }, []);
}

/**
 * Group array of department associations results by email, creating a key-value
 * pair where the value is a list of department IDs.
 *
 * @param arr     The array to group
 * @returns {*}   The object with the user email and list of department IDs
 */
function groupDepartmentIdByFaculty(arr) {
  return arr.reduce((acc, cur) => {
    const exists = acc.email === cur.email;

    if (!exists) {
      return { email: cur.email, department_ids: [cur.department_id] };
    }

    acc['department_ids'].push(cur.department_id);
    return acc;
  }, []);
}

/**
 * Gets a senate division record by its short name.
 *
 * @param shortName   Short name of the senate division
 * @returns {Promise} Query response on success, error on failure
 */
async function getSenateDivision(shortName) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'SELECT senate_division_short_name, name FROM senate_division WHERE senate_division_short_name=$1',
    [shortName]
  );
}

/**
 * Gets all the senate divisions.
 *
 * @returns {Promise}   Query response object on success, error on failure
 */
async function getSenateDivisions() {
  const connection = loadDatabaseConnection();

  return connection.any(
    'SELECT senate_division_short_name, name FROM senate_division ORDER BY senate_division_short_name ASC'
  );
}

/**
 * Gets senate division stats.
 *
 * @returns {Promise}   Query response object on success, error on failure
 */
async function getSenateDivisionStats() {
  const connection = loadDatabaseConnection();
  const query = reports.divisionStats;
  return connection.oneOrNone(query, divisionStats => {
    if (divisionStats) {
      return divisionStats.json_build_object;
    } else {
      return null;
    }
  });
}

/**
 * Gets a list of survey choices by their date and email.
 *
 * @param date        Date of the survey choice
 * @param email       Email of the faculty member
 * @returns {Promise} Query response on success, error on failure
 */
async function getSurveyChoice(date, email) {
  const connection = loadDatabaseConnection();

  return connection.many(
    'SELECT choice_id, survey_date, email, committee_id FROM survey_choice WHERE EXTRACT(year FROM survey_date) = $1 and email = $2',
    [date, email]
  );
}

function getSurveyData(year, email) {
  const connection = loadDatabaseConnection();

  return connection.one(
    'SELECT survey_date, email, is_interested, expertise FROM survey_data WHERE EXTRACT(year FROM "survey_date")=$1 AND email=$2',
    [year, email]
  );
}

/**
 * Updates a committee in the database.
 *
 * Allows for a committee's properties to be changed, except a committee's name.
 *
 * @param id                  Id of the committee (Required)
 * @param name                Name of the committee (Required)
 * @param description         Description of the committee
 * @param slots               Number of total available slots
 * @returns {Promise}         Response object with rowCount on success
 * @throws {Error}            Connection problem or exception
 */
async function updateCommittee(id, name, description, slots) {
  const connection = loadDatabaseConnection();

  return connection.tx(() => {
    return connection.result(
      'UPDATE committee SET name = $1, description = $2, total_slots = $3 WHERE committee_id = $4',
      [name, description, slots, id]
    );
  });
}

/**
 * Updates a committee assignment in the database.
 *
 * @param email               Email of committee member
 * @param committeeId         Id of the committee
 * @param startDate           Start date for the committee member
 * @param endDate             End date for the committee member
 * @returns {Promise}         Response object with rowCount on success
 * @throws {Error}            Connection problem or exception
 */
async function updateCommitteeAssignment(email, committeeId, startDate, endDate) {
  const connection = loadDatabaseConnection();

  return connection.tx(() => {
    return connection.result(
      'UPDATE committee_assignment SET start_date = $1, end_date = $2 WHERE email = $3 and committee_id = $4',
      [startDate, endDate, email, committeeId]
    );
  });
}

/**
 * Updates committee slots in the database.
 *
 * @param committeeId         Committee id to add slots to
 * @param senateDivision      The senate division
 * @param slotRequirements    The number of slots this committee has
 * @returns {Promise}         Response object with rowCount on success
 * @throws {Error}            Connection problem or exception
 */
async function updateCommitteeSlots(committeeId, senateDivision, slotRequirements) {
  const connection = loadDatabaseConnection();

  const slotDifference = await connection
    .one(
      'SELECT $2-slot_requirements AS difference FROM committee_slots where committee_id=$1 AND senate_division_short_name=$3',
      [committeeId, slotRequirements, senateDivision]
    )
    .catch(err => {
      return err;
    });

  return connection.tx(t => {
    return t.batch([
      t.result(
        'UPDATE committee_slots SET slot_requirements = $1 WHERE committee_id = $2 and senate_division_short_name = $3',
        [slotRequirements, committeeId, senateDivision]
      ),
      t.result(
        'UPDATE committee SET total_slots =(total_slots+$2) WHERE committee_id=$1',
        [committeeId, slotDifference.difference]
      ),
    ]);
  });
}

/**
 * Updates department for a faculty member
 * @param email               Faculty email address
 * @param newDepartmentId     The new department that the faculty member belongs to
 * @param oldDepartmentId     The old department that the faculty member no longer belongs to
 * @returns {Promise<any>}    Response object with rowCount on success
 * @throws {Error}            Connection problem or exception
 */
async function updateDepartmentAssociations(
  email,
  oldDepartmentId,
  newDepartmentId
) {
  const connection = loadDatabaseConnection();

  return connection.tx(() => {
    return connection.result(
      'UPDATE department_associations SET department_id = $3 WHERE email = $1 and department_id =$2',
      [email, oldDepartmentId, newDepartmentId]
    );
  });
}

/**
 * Updates a faculty member in the database.
 *
 * @param fullName            Name of the faculty member
 * @param email               Email of the faculty member
 * @param jobTitle            Job title of the faculty member
 * @param phoneNum            Phone number of faculty member
 * @param senateDivision      Senate division the faculty member belongs to
 * @param departmentAssociations  Array of department ids to associate the faculty member to
 * @returns {Promise}         Resolves object with rowCount or rejects
 */
async function updateFaculty(
  fullName,
  email,
  jobTitle,
  phoneNum,
  senateDivision,
  departmentAssociations
) {
  const connection = loadDatabaseConnection();
  const pgp = connection.$config.pgp;

  if (Array.isArray(departmentAssociations)) {
    const departmentAssociationsWithEmail = departmentAssociations.map(e => {
      return e.value === undefined ? { ...e, email: email } : e;
    });

    if (departmentAssociations.length) {
      return connection.tx(t => {
        return t.batch([
          t.result(
            'UPDATE faculty SET full_name = $1, job_title = $2, phone_num = $3, senate_division_short_name = $4 WHERE email = $5',
            [fullName, jobTitle, phoneNum, senateDivision, email]
          ),
          t.result('DELETE FROM department_associations WHERE email = $1', [email]),
          t.any(
            pgp.helpers.insert(
              departmentAssociationsWithEmail,
              ['email', 'department_id'],
              'department_associations'
            )
          ),
        ]);
      });
    } else {
      return connection.tx(t => {
        return t.batch([
          t.result(
            'UPDATE faculty SET full_name = $1, job_title = $2, phone_num = $3, senate_division_short_name = $4 WHERE email = $5',
            [fullName, jobTitle, phoneNum, senateDivision, email]
          ),
          t.result('DELETE FROM department_associations WHERE email = $1', [email]),
        ]);
      });
    }
  } else {
    return connection.tx(t => {
      return t.batch([
        t.result(
          'UPDATE faculty SET full_name = $1, job_title = $2, phone_num = $3, senate_division_short_name = $4 WHERE email = $5',
          [fullName, jobTitle, phoneNum, senateDivision, email]
        ),
      ]);
    });
  }
}

/**
 * Updates survey data in the database
 *
 * @param surveyDate    Date of Survey
 * @param email         Email of faculty member
 * @param interested    Interested in serving
 * @param expertise     Expertise for serving
 * @returns {Promise}   Response object with rowCount on success
 * @throws  {Error}     Connection problem or exception
 */
async function updateSurveyData(surveyDate, email, interested, expertise) {
  const connection = loadDatabaseConnection();

  return connection.tx(() => {
    return connection.result(
      'UPDATE survey_data SET is_interested = $3, expertise = $4 WHERE survey_date = $1 AND email = $2',
      [surveyDate, email, interested, expertise]
    );
  });
}

module.exports = {
  addCommittee,
  addCommitteeAssignment,
  addCommitteeSlots,
  addDepartmentAssociation,
  addFaculty,
  addSurveyChoice,
  addSurveyData,
  deleteCommitteeAssignment,
  deleteSlotRequirement,
  getAllFaculty,
  getCommittee,
  getCommitteeAssignmentByCommittee,
  getCommitteeAssignmentByFaculty,
  getCommitteeInfo,
  getCommitteeSlotsByCommittee,
  getCommitteeSlotsBySenate,
  getCommittees,
  getDepartment,
  getDepartmentAssociationsByDepartment,
  getDepartmentAssociationsByFaculty,
  getDepartments,
  getFaculty,
  getFacultyInfo,
  getSenateDivision,
  getSenateDivisions,
  getSenateDivisionStats,
  getSurveyChoice,
  getSurveyData,
  updateCommittee,
  updateCommitteeAssignment,
  updateCommitteeSlots,
  updateDepartmentAssociations,
  updateFaculty,
  updateSurveyData,
};
