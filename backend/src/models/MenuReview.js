const mongoose = require('mongoose');

const MenuReviewSchema = new mongoose.Schema(
  {
    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'approved'
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: false
    },
    isVerified: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

MenuReviewSchema.index({ menu: 1, customer: 1 }, { unique: true });
MenuReviewSchema.index({ menu: 1, rating: -1 });

module.exports = mongoose.model('MenuReview', MenuReviewSchema);
