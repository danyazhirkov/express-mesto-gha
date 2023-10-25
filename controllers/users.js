const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BadRequest = require('../errors/BadRequest');
const NotFound = require('../errors/NotFound');

const ConflictError = require('../errors/ConflictError');
// const newError = require('../middlewares/newError');

const NotError = 200;

const getUsers = (req, res, next) => {
  User.find({})
    .then((users) => {
      res.status(NotError).send(users);
    })
    .catch(next);
};

const createUser = (req, res, next) => {
  const {
    name, about, avatar, email, password,
  } = req.body;
  bcrypt.hash(password, 10)
    .then((hash) => User.create({
      name, about, avatar, email, password: hash,
    }))
    .then((user) => res.status(201).send({
      name: user.name,
      about: user.about,
      avatar: user.avatar,
      email: user.email,
      _id: user._id,
    }))
    .catch((err) => {
      if (err.code === 11000) {
        next(new ConflictError('Пользователь с таким email уже зарегистрирован'));
      } else if (err instanceof mongoose.Error.ValidationError) {
        next(new BadRequest(err.message));
      } else {
        next(err);
      }
    });
};

const login = (req, res, next) => {
  const { email, password } = req.body;
  return User.findUserByCredentials(email, password)
    .then((user) => {
      const payload = { _id: user._id };
      const token = jwt.sign(payload, 'some-secret-key', { expiresIn: '7d' });
      res.status(NotError).send({ token });
    })
    .catch(next);
};

const getUserInfo = (req, res, next) => {
  const { _id } = req.user;
  User.findById(_id).orFail(() => new NotFound('Данных с указанным id не существует'))
    .then((user) => {
      res.status(NotError).send({ data: user });
    })

    .catch((err) => {
      if (err instanceof mongoose.Error.CastError) {
        return next(new BadRequest('Ошибка: Неверные данные'));
      }

      return next(err);
    });
};

const getUserById = (req, res, next) => {
  const { userId } = req.params;

  User.findById(userId)
    .then((user) => {
      if (!user) {
        throw new NotFound('Пользователь с таким id не найден');
      }
      return res.status(NotError).send({ user });
    })
    .catch((error) => {
      if (error.name === 'CastError') {
        next(new BadRequest('Ошибка: Неверные данные'));
      } else {
        next(error);
      }
    });
};

const editUser = (req, res, next) => {
  const { name, about } = req.body;
  User.findByIdAndUpdate(req.user._id, { name, about }, { new: true, runValidators: true })
    .then((user) => {
      if (!user) {
        throw new NotFound('Переданы некорректные данные при обновлении профиля.');
      }
      return res.status(NotError).send({ data: user });
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
        next(new BadRequest('Пользователь с указанным _id не найден.'));
      }
      return next(error);
    });
};

const editAvatar = (req, res, next) => {
  const { avatar } = req.body;
  const userId = req.user._id;

  User.findByIdAndUpdate(userId, { avatar }, {
    new: true,
    runValidators: true,
  })
    .then((user) => {
      res.send({ data: user });
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
        return next(new BadRequest('Переданы некорректные данные при обновлении аватара.'));
      }
      return next(error);
    });
};

module.exports = {
  getUsers,
  getUserInfo,
  getUserById,
  createUser,
  editUser,
  editAvatar,
  login,
};
