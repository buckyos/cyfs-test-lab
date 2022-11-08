import {cyfs} from '../../cyfs_node';
import mongoose from "mongoose";
import {TestcaseManger} from "./testcaseInfo";
import {stack} from '../utils/stack';
import {DEC_ID_BASE58} from "../../config/decApp"
import {Model} from "./model";
import {requestService} from '../utils/request'

// Create Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  identity: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});
export const User = mongoose.model("users", UserSchema);
