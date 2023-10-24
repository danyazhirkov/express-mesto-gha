const Card = require('../models/card');
const BadRequest = require('../errors/BadRequest');
const NotFound = require('../errors/NotFound');
const Forbidden = require('../errors/Forbidden');

const NotError = 200;
const CreateCode = 201;

const getInitialCards = (req, res, next) => {
  Card.find({})
    .then((cards) => res.status(NotError).send(cards))
    .catch(next);
};

const createNewCard = (req, res, next) => {
  const { name, link } = req.body;
  const owner = req.user._id;

  Card.create({ name, link, owner })
    .then((card) => res.status(CreateCode).send(card))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        next(new BadRequest('Переданы некорректные данные при создании карточки.'));
      } else {
        next(err);
      }
    });
};

const deleteCard = (req, res, next) => {
  const { cardId } = req.params;

  Card.findById(cardId)
    .orFail(() => {
      throw new NotFound('Карточка с указанным _id не найдена');
    })
    .then((card) => {
      if (card.owner.toString() !== req.user._id) {
        throw new Forbidden('Вы не можете удалить эту карточку');
      }
      return Card.findByIdAndRemove(cardId).then(() => res.status(200).send(card));
    })
    .catch(next);
};

const likeCard = (req, res, next) => {
  Card.findByIdAndUpdate(
    req.params.cardId,
    { $addToSet: { likes: req.user._id } },
    { new: true },
  )
    .then((card) => {
      if (!card) {
        throw new NotFound('Передан несуществующий _id карточки.');
      }
      return res.status(NotError).send(card);
    })
    .catch((error) => {
      if (error.name === 'CastError') {
        return next(new BadRequest('Переданы некорректные данные для постановки лайка.'));
      }
      return next(error);
    });
};

const disLike = (req, res, next) => {
  Card.findByIdAndUpdate(
    req.params.cardId,
    { $pull: { likes: req.user._id } },
    { new: true },
  )
    .then((card) => {
      if (!card) {
        throw new NotFound('Передан несуществующий _id карточки.');
      }
      return res.status(NotError).send(card);
    })
    .catch((error) => {
      if (error.name === 'CastError') {
        return next(new BadRequest('Переданы некорректные данные для снятии лайка.'));
      }
      return next(error);
    });
};

module.exports = {
  getInitialCards,
  createNewCard,
  deleteCard,
  likeCard,
  disLike,
};
