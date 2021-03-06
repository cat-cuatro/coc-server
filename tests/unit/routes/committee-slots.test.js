const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const mock = require('./mock');

const underTestFilename = '../../../src/routes/committee-slots.js';

const routerDelete = sinon.stub();
const routerGet = sinon.stub();
const routerPut = sinon.stub();
const routerPost = sinon.stub();
const routerActions = {};

const stubs = {
  express: {
    Router: () => ({
      delete: routerDelete,
      get: routerGet,
      put: routerPut,
      post: routerPost,
    }),
  },
  '../database': {
    addCommitteeSlots: sinon.stub(),
    getCommitteeSlotsBySenate: sinon.stub(),
    getCommitteeSlotsByCommittee: sinon.stub(),
    updateCommitteeSlots: sinon.stub(),
    deleteSlotRequirement: sinon.stub(),
  },
};
describe('Request routing for /committee-slots', () => {
  let underTest; // eslint-disable-line
  let req;
  let res;

  before(() => {
    underTest = proxyquire(underTestFilename, stubs);
    routerActions.getCommitteeSlotsByCommittee = routerGet.secondCall.args[1];
    routerActions.getCommitteeSlotsBySenate = routerGet.firstCall.args[1];
    routerActions.putCommitteeSlots = routerPut.firstCall.args[1];
    routerActions.postCommitteeSlots = routerPost.firstCall.args[1];
  });

  beforeEach(() => {
    req = mock.request();
    res = mock.response();
  });

  afterEach(() => {
    routerGet.resetHistory();

    stubs['../database'].addCommitteeSlots.resetHistory();
    stubs['../database'].getCommitteeSlotsByCommittee.resetHistory();
    stubs['../database'].getCommitteeSlotsBySenate.resetHistory();
  });

  it('PUT returns 200 when committee slots are updated in the database', () => {
    req.params = {
      id: 1,
      name: 'test-senate-division',
    };
    req.body.slotRequirements = 3;
    stubs['../database'].updateCommitteeSlots.resolves([{ rowCount: 1 }]);

    return routerActions.putCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 200);
    });
  });

  it('PUT returns 400 when missing slotRequirements in request body', () => {
    req.params = {
      id: 1,
      name: 'test-senate-division',
    };

    return routerActions.putCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 400);
      assert.deepEqual(res.send.firstCall.args[0], {
        message: 'Bad Request',
      });
    });
  });

  it('PUT returns 404 when committee slots record did not exist to update', () => {
    req.params = {
      id: 1000,
      name: 'test-missing-senate-division',
    };
    req.body.slotRequirements = 3;
    stubs['../database'].updateCommitteeSlots.resolves([{ rowCount: 0 }]);

    return routerActions.putCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 404);
    });
  });

  it('PUT returns 500 when unable to update committee slots in the database', () => {
    req.params = {
      id: 1,
      name: 'test-senate-division',
    };
    req.body.slotRequirements = 3;
    stubs['../database'].updateCommitteeSlots.rejects(
      new Error('test-database-error')
    );

    return routerActions.putCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 500);
      assert.deepEqual(res.send.firstCall.args[0], {
        message: 'Internal Server Error',
        error: 'test-database-error',
      });
    });
  });

  it('POST returns 201 when committee slots are added to the database', () => {
    const committeeId = 1;
    req.body = {
      committeeId,
      senateDivision: 'test-senate-division',
      slotRequirements: 3,
    };
    stubs['../database'].addCommitteeSlots.resolves(committeeId);

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert(res.set.called);
      assert.equal(res.status.firstCall.args[0], 201);
    });
  });

  it('POST returns 400 when missing committee id in request body', () => {
    req.body = {
      senateDivision: 'test-senate-division',
      slotRequirements: 3,
    };

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 400);
      assert.deepEqual(res.send.firstCall.args[0], { message: 'Bad Request' });
    });
  });

  it('POST returns 400 when missing senate division short name in request body', () => {
    req.body = {
      committeeId: 1,
      slotRequirements: 3,
    };

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 400);
      assert.deepEqual(res.send.firstCall.args[0], { message: 'Bad Request' });
    });
  });

  it('POST returns 400 when missing slot requirements in request body', () => {
    req.body = {
      committeeId: 1,
      senateDivision: 'test-senate-division',
    };

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 400);
      assert.deepEqual(res.send.firstCall.args[0], { message: 'Bad Request' });
    });
  });

  it('POST returns 409 when foreign keys do not exist in the database', () => {
    req.body = {
      committeeId: 1,
      senateDivision: 'test-invalid-senate-division',
      slotRequirements: 3,
    };
    stubs['../database'].addCommitteeSlots.rejects({ code: '23503' });

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 409);
    });
  });

  it('POST returns 409 when committee id and senate division short name pair already exists in the database', () => {
    req.body = {
      committeeId: 1,
      senateDivision: 'test-existing-senate-division',
      slotRequirements: 3,
    };
    stubs['../database'].addCommitteeSlots.rejects({ code: '23505' });

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 409);
    });
  });

  it('POST returns 500 when unable to get committee assignment from database', () => {
    req.body = {
      committeeId: 1,
      senateDivision: 'test-senate-division',
      slotRequirements: 3,
    };
    stubs['../database'].addCommitteeSlots.rejects(new Error('test-error'));

    return routerActions.postCommitteeSlots(req, res).then(() => {
      assert.equal(res.status.firstCall.args[0], 500);
      assert.deepEqual(res.send.firstCall.args[0], {
        message: 'Internal Server Error',
        error: 'test-error',
      });
    });
  });

  describe('Route /senate-division/:shortname', () => {
    it('GET returns 200 when slot-requirements are retrieved from database', () => {
      const slotRequirements = [
        { committee_id: 1, slot_requirements: 2 },
        { committee_id: 2, slot_requirements: 5 },
      ];

      req.params.shortname = 'AO';

      stubs['../database'].getCommitteeSlotsBySenate.resolves(slotRequirements);

      return routerActions.getCommitteeSlotsBySenate(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 200);
        assert.equal(res.send.firstCall.args[0], slotRequirements);
      });
    });

    it('GET returns 404 when there are no slot requirements', () => {
      req.params.shortname = 'AO';

      stubs['../database'].getCommitteeSlotsBySenate.resolves([]);

      return routerActions.getCommitteeSlotsBySenate(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 404);
      });
    });

    it('GET returns 500 when there is a database error', () => {
      req.params.shortname = 'AO';

      stubs['../database'].getCommitteeSlotsBySenate.rejects(
        new Error('test-error')
      );

      return routerActions.getCommitteeSlotsBySenate(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 500);
      });
    });
  });

  describe('Route /committee/:id', () => {
    it('GET returns 200 when slot-requirements are retrieved from database', () => {
      const slotRequirements = [
        { senate_division_short_name: 'BQ', slot_requirements: 2 },
        { senate_division_short_name: 'AO', slot_requirements: 5 },
      ];

      req.params.id = 1;

      stubs['../database'].getCommitteeSlotsByCommittee.resolves(slotRequirements);

      return routerActions.getCommitteeSlotsByCommittee(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 200);
        assert.equal(res.send.firstCall.args[0], slotRequirements);
      });
    });

    it('GET returns 404 when there are no slot requirements', () => {
      req.params.id = 1;

      stubs['../database'].getCommitteeSlotsByCommittee.resolves([]);

      return routerActions.getCommitteeSlotsByCommittee(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 404);
      });
    });

    it('GET returns 500 when there is a database error', () => {
      req.params.id = 1;

      stubs['../database'].getCommitteeSlotsByCommittee.rejects(
        new Error('test-error')
      );

      return routerActions.getCommitteeSlotsByCommittee(req, res).then(() => {
        assert.equal(res.status.firstCall.args[0], 500);
      });
    });
  });
  describe('Request routing for /committee-slots/:committee_id/:senate_division_short_name', () => {
    let underTest; // eslint-disable-line
    let req;
    let res;

    before(() => {
      underTest = proxyquire(underTestFilename, stubs);
      routerActions.deleteSlotRequirement = routerDelete.firstCall.args[1];
    });

    beforeEach(() => {
      req = mock.request();
      res = mock.response();
    });

    afterEach(() => {
      routerDelete.resetHistory();

      stubs['../database'].deleteSlotRequirement.resetHistory();
    });

    it('DELETE returns 200 when slot requirement is deleted from the database', () => {
      req.params = {
        committee_id: 1,
        senate_division_short_name: 'test-sdsn',
      };
      const expected = {
        command: 'DELETE',
        rowCount: 1,
      };
      stubs['../database'].deleteSlotRequirement.resolves(expected);

      return routerActions.deleteSlotRequirement(req, res).then(() => {
        assert(res.send.called);
        assert.equal(res.status.firstCall.args[0], 200);
      });
    });

    it('DELETE returns 404 when slot requirement is not found in the database', () => {
      req.params = {
        committee_id: 1,
        senate_division_short_name: 'test-sdsn',
      };
      const expected = {
        command: 'DELETE',
        rowCount: 0,
      };
      stubs['../database'].deleteSlotRequirement.resolves(expected);

      return routerActions.deleteSlotRequirement(req, res).then(() => {
        assert(res.send.called);
        assert.equal(res.status.firstCall.args[0], 404);
      });
    });
  });
});
