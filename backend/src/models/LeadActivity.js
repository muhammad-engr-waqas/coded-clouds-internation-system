import mongoose from 'mongoose';

/**
 * LeadActivity — tracks every change made to a SalesLead row.
 * Used by the "Activity Log" section visible to both Sales users (their own leads)
 * and Admins (all leads).
 */
const leadActivitySchema = new mongoose.Schema(
  {
    leadId:    { type: mongoose.Schema.Types.ObjectId, ref: 'SalesLead', required: true, index: true },
    leadRefId: { type: String },  // human-readable e.g. "LD-0042" — denormalised for fast display
    actor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String },  // denormalised snapshot
    action: {
      type: String,
      enum: [
        'CREATED',
        'UPDATED',
        'STATUS_CHANGED',
        'ASSIGNED',
        'DELETED',
        'IMPORTED',
        'ROW_DUPLICATED',
      ],
      required: true,
    },
    // Which fields changed — array of { field, from, to }
    changes: [
      {
        field: { type: String },
        from:  { type: mongoose.Schema.Types.Mixed },
        to:    { type: mongoose.Schema.Types.Mixed },
      },
    ],
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('LeadActivity', leadActivitySchema);
