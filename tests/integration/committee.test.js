const decache = require('decache');
const knex = require('../../db/knex');
const request = require('supertest');
const sinon = require('sinon');

/**
 * Suppresses any console logging, so that there is no noise in the console
 * when the integration tests are ran.
 *
 * It is only set on this file because it is the first file to be loaded by
 * the tests, and this setting persists throughout.
 */
function suppressLogging() {
  sinon.stub(console, 'error');
  sinon.stub(console, 'info');
  sinon.stub(console, 'log');
}

describe('Request routing for /api/committee', () => {
  let app;
  suppressLogging();

  beforeEach(async () => {
    decache('../../src');
    app = require('../../src');

    await knex.migrate.rollback();
    await knex.migrate.latest();
    await knex.seed.run();
  });

  afterEach(done => {
    knex.migrate.rollback().then(() => {
      app.close(done);
    });
  });

  it('POST returns 201 when insertion succeeds', done => {
    const payload = {
      name: 'test-committee-name',
      description: 'test-committee-description',
      totalSlots: 42,
    };

    request(app)
      .post('/api/committee')
      .send(payload)
      .expect('Location', 'http://localhost:8080/api/committee/20')
      .expect(201, { message: 'Success' }, done);
  });

  it('PUT returns 200 when update succeeds', done => {
    const payload = {
      committeeId: 1,
      name: 'Linux Committee',
      description: 'tux-everywhere',
      totalSlots: 20,
    };

    request(app)
      .put('/api/committee')
      .send(payload)
      .expect(200, { message: 'Success' }, done);
  });

  it('PUT returns 404 when target record to update does not exist', done => {
    const payload = {
      committeeId: 1000,
      name: 'Linux Committee',
      description: 'tux-everywhere',
      totalSlots: 3,
    };

    request(app)
      .put('/api/committee')
      .send(payload)
      .expect(404, { message: 'Resource Not Found' }, done);
  });

  it('PUT returns 409 when trying to reduce total slots below minimums', done => {
    const payload = {
      committeeId: 1,
      name: 'Committee on Committees',
      description: 'tux-everywhere',
      totalSlots: 1,
    };

    request(app)
      .put('/api/committee')
      .send(payload)
      .expect(409, done);
  });

  it('GET returns 200 when record exists', done => {
    request(app)
      .get('/api/committee/1')
      .expect(200, done);
  });

  it('GET returns 404 when record does not exist', done => {
    request(app)
      .get('/api/committee/10000')
      .expect(404, { message: 'Resource Not Found' }, done);
  });

  describe('getCommitteeInfo', () => {
    it('GET returns 200 and committee info record by id', done => {
      request(app)
        .get('/api/committee/info/1')
        .expect(200, done);
    });
  });
});
