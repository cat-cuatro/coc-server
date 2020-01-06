const express = require('express');
const router = express.Router();
const {
  getDepartmentAssociationsByDepartment,
  getDepartmentAssociationsByFaculty,
  updateDepartmentAssociations,
} = require('../database');

router.get('/department/:id', async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send({ message: '400 Bad Request' });
  }

  return await getDepartmentAssociationsByDepartment(req.params.id)
    .then(data => {
      if (data.length === 0) {
        console.info(`No department association found for id ${req.params.id}`);
        return res.status(404).send();
      }

      console.info('Successfully retrieved department association from database');
      return res.status(200).send(data);
    })
    .catch(err => {
      console.error(`Error retrieving department association: ${err}`);
      return res
        .status(500)
        .send({ error: 'Unable to complete database transaction' });
    });
});

router.get('/faculty/:email', async (req, res) => {
  if (!req.params.email) {
    return res.status(400).send({ message: '400 Bad Request' });
  }

  return await getDepartmentAssociationsByFaculty(req.params.email)
    .then(data => {
      if (data.length === 0) {
        console.info(
          `No department association found for email ${req.params.email}`
        );
        return res.status(404).send();
      }

      console.info('Successfully retrieved department association from database');
      return res.status(200).send(data);
    })
    .catch(err => {
      console.error(`Error retrieving department association: ${err}`);
      return res
        .status(500)
        .send({ error: 'Unable to complete database transaction' });
    });
});

router.put('/', async (req, res) => {
  if (
    !req.body ||
    !req.body.email ||
    !req.body.oldDepartmentId ||
    !req.body.newDepartmentId
  ) {
    return res.status(400).send({ message: '400 Bad Request' });
  }

  const { email, oldDepartmentId, newDepartmentId } = req.body;

  return await updateDepartmentAssociations(email, oldDepartmentId, newDepartmentId)
    .then(result => {
      if (!result.rowCount) {
        console.info(
          `Unable to update department association, email ${email} does not exist`
        );
        return res.status(404).send();
      }
      console.info(`Updated department association with email ${email}`);
      return res.status(200).send();
    })
    .catch(err => {
      console.error(`Error updating department association in database: ${err}`);
      return res
        .status(500)
        .send({ error: 'Unable to complete database transaction' });
    });
});

module.exports = router;