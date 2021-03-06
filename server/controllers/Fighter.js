const models = require('../models');

const Fighter = models.Fighter;
const Account = models.Account; // need this to reference number of fighters already on the account

const makerPage = (req, res) => {
  Fighter.FighterModel.findByAccount(req.session.account._id, (err, docs) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ error: 'An error occurred ' });
    }

    return res.render('app', { csrfToken: req.csrfToken(), fighters: docs });
  });
};

const getFighters = (request, response) => {
  const req = request;
  const res = response;

  return Fighter.FighterModel.findByAccount(req.session.account._id, (err, docs) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ error: 'An error occurred' });
    }

    return res.json({ fighters: docs });
  });
};

const getAllFighters = (request, response) => {
  const res = response;

  return Fighter.FighterModel.findAll((err, docs) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ error: 'An error occurred' });
    }

    return res.json({ fighters: docs });
  });
};

const deleteFighter = (request, response) => {
  const req = request;
  const res = response;

  return Fighter.FighterModel.deleteByName(req.session.account._id, req.body.name, (err) => {
    // add one more fighter to the account model
    Account.AccountModel.findByUsername(req.session.account.username, (er, doc) => {
      if (er) {
        console.dir(er);
      }

      const account = doc;
      account.numFighters -= 1;

      const accountPromise = doc.save();

      accountPromise.then(() => {

      });

      accountPromise.catch(error => {
        console.dir(error);
      });
    });

    if (err) {
      console.log(err);
      return res.status(400).json({ error: 'An error occured' });
    }

    return res.json({ message: 'Fighter deleted successfully' });
  });
};

const makeFighter = (req, res) => {
  // cast everything as a number (except name of course)
  const name = req.body.name;

  /* STATS */
  const health = Number(req.body.health);
  const maxHealth = Number(req.body.health);
  const damage = Number(req.body.damage);
  const speed = Number(req.body.speed);
  const armor = Number(req.body.armor);
  const crit = Number(req.body.crit);

  /* INFO */
  const level = 1;
  const levelupPts = 0;
  const xp = 0;
  const xpToNext = 12;
  const wins = 0;
  const fights = 0;
  const kills = 0;
  const revivals = 0;
  const logs = '';

  if (!name || !health || !damage || !speed || !armor || !crit) {
    return res.status(400).json({ error: 'All fighter stats required' });
  }

  if (health + damage + speed + armor + crit > 36) {
    return res.status(400).json({ error: 'stats must not exceed 36' });
  }

  if (name.length > 25) {
    return res.status(400).json({ error: 'fighter name must not exceed 25 characters' });
  }

  // check how many fighters the account has
  return Account.AccountModel.findByUsername(req.session.account.username, (err, doc) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'An error occurred' });
    }

    const account = doc;

    // console.log(`num fighters: ${account.numFighters} max fighters: ${account.maxFighters}`);
    // console.dir(account);

    // if the user is at max fighters, don't let them make another one
    if (account.numFighters >= account.maxFighters) {
      return res.status(400).json({
        error: `You hit your fighter limit. Delete one of your existing fighters 
        to create a new one, or purchase an additional slot from the Account page`,
      });
    }

    const fighterData = {
      name,
      health,
      maxHealth,
      damage,
      speed,
      armor,
      crit,
      level,
      levelupPts,
      xp,
      xpToNext,
      wins,
      fights,
      kills,
      revivals,
      logs,
      username: req.session.username,
      account: req.session.account._id,
    };

    const newFighter = new Fighter.FighterModel(fighterData);

    const fighterPromise = newFighter.save();

    fighterPromise.then(() => {
      // increase number of fighters on the account
      // console.dir(account.username);

      account.numFighters += 1;
      const accountPromise = doc.save();

      accountPromise.then(() => {

      });

      accountPromise.catch(error => {
        console.dir(error);
      });

      res.json({ redirect: '/maker' });
    });

    fighterPromise.catch((er) => {
      // console.log(err);
      if (er.code === 11000) {
        return res.status(400).json({ error: 'Fighter already exists.' });
      }

      return res.status(400).json({ error: 'An error occurred' });
    });

    return fighterPromise;
  });
};

const upgradeFighter = (req, res) => {
  // get each piece
  const name = req.body.name;
  const acct = req.session.account._id;
  const stat = req.body.stat;
  // console.dir(`name:${name} acct:${acct} stat:${stat}`);

  // get the fighter
  return Fighter.FighterModel.findByNameId(name, acct, (err, fght) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ error: 'An error occurred' });
    }
    const fighter = fght;

    // check if the fighter is dead
    // this is so you can't upgrade the health of a dead fighter by 1 to make them alive lmao
    if (fighter.health === 0) {
      return res.status(400).json({ error: "Can't upgrade a dead fighter" });
    }

    // check if the fighter has upgrade points available
    if (fighter.levelupPts < 1) {
      return res.status(400).json({ error: 'No upgrades available' });
    }

    if (stat === 'health') {
      // make sure if they upgrade health, we also upgrade max health
      fighter.maxHealth += 1;
    }

    fighter[stat] += 1; // upgrade the stat they want
    fighter.levelupPts -= 1; // they used a level up point

    const fighterPromise = fighter.save();

    fighterPromise.then(() => res.json({ }));

    fighterPromise.catch(() => res.status(400).json({ error: 'An error occurred' }));

    return fighterPromise;
  });
};

const reviveFighter = (request, response) => {
  const req = request;
  const res = response;

  // get the account
  return Account.AccountModel.findByUsername(req.session.account.username, (er1, acct) => {
    if (er1) {
      return res.status(400).json({ error: 'A problem occurred' });
    }

    const account = acct;
    if (account.revivals < 1) {
      return res.status(400).json({
        error: 'No Revivals available. Purchase more from the store page',
      });
    }

    // get the fighter
    return Fighter.FighterModel.
    findByNameId(req.body.name, req.session.account._id, (er2, fght) => {
      if (er2) {
        return res.status(400).json({ error: 'A problem occurred' });
      }
      const fighter = fght;

      // check if its already fine
      if (fighter.health !== 0) {
        return res.status(400).json({ error: 'Fighter is already alive!' });
      }

      // revive it
      fighter.health = fighter.maxHealth;

      // increase its number of revivals
      fighter.revivals += 1;

      // remove a revival from the account
      account.revivals -= 1;

      const fighterPromise = fighter.save();

      fighterPromise.then(() => {
        const accountPromise = account.save();

        accountPromise.then(() => res.json({ message: 'Fighter has been revived' }));

        accountPromise.catch(() => res.status(400).json({ error: 'An error occurred' }));
      });

      fighterPromise.catch(() => res.status(400).json({ error: 'An error occurred' }));

      return fighterPromise;
    });
  });
};

module.exports.upgradeFighter = upgradeFighter;
module.exports.makerPage = makerPage;
module.exports.getFighters = getFighters;
module.exports.getAllFighters = getAllFighters;
module.exports.make = makeFighter;
module.exports.deleteFighter = deleteFighter;
module.exports.reviveFighter = reviveFighter;