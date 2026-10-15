const express = require('express');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
router.use(authMiddleware);

// Get User Tasks
router.get('/', async (req, res) => {
  const tasks = await Task.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(tasks);
});

// Create Task
router.post('/', async (req, res) => {
  const newTask = new Task({ ...req.body, user: req.userId });
  await newTask.save();
  res.json(newTask);
});

// Update / Toggle Task
router.put('/:id', async (req, res) => {
  const updatedTask = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true }
  );
  res.json(updatedTask);
});

// Delete Task
router.delete('/:id', async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  res.json({ message: 'Task deleted' });
});

module.exports = router;