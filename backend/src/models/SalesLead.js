import mongoose from 'mongoose';

// Auto-increment counter for Lead IDs (LD-0001, LD-0002, …)
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.LeadCounter || mongoose.model('LeadCounter', counterSchema);

const salesLeadSchema = new mongoose.Schema(
  {
    leadId: { type: String, unique: true, index: true }, // LD-0001
    date: { type: Date, default: Date.now },

    companyName:   { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    phone:         { type: String, default: '' },
    email:         { type: String, default: '', trim: true, lowercase: true },
    city:          { type: String, default: '' },
    industry:      { type: String, default: '' },

    source: {
      type: String,
      enum: ['Website', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp', 'Referral', 'Cold Call', 'Walk-in', 'Other', ''],
      default: '',
    },

    requirement: { type: String, default: '' },

    leadStatus: {
      type: String,
      enum: [
        'New', 'Contacted', 'Follow-up', 'Interested', 'Meeting Scheduled',
        'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Not Interested', '',
      ],
      default: 'New',
    },

    followUpDate: { type: Date, default: null },

    // assignedTo: the salesperson who owns this lead
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    remarks: { type: String, default: '' },

    // Who created it (Admin can create on behalf of anyone)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Track last update for "Updated Today" card
    updatedAt: { type: Date },        // overridden by timestamps
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Pre-save: auto-generate leadId if new
salesLeadSchema.pre('save', async function (next) {
  if (this.isNew && !this.leadId) {
    const counter = await Counter.findByIdAndUpdate(
      'lead_seq',
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.leadId = `LD-${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

export { Counter as LeadCounter };
export default mongoose.model('SalesLead', salesLeadSchema);
