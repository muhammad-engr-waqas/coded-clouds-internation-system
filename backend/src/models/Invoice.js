import mongoose from 'mongoose';

const serviceItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    amount:      { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true }, // e.g. CC-007
    date:          { type: String, required: true },             // YYYY-MM-DD string
    currency:      { type: String, enum: ['SAR', 'PKR', 'USD', 'EUR'], default: 'SAR' },
    clientName:    { type: String, default: '', trim: true },
    clientContact: { type: String, default: '' },
    billNumber:    { type: String, default: '' },
    services:      { type: [serviceItemSchema], default: [] },
    notes:         { type: String, default: '' },
    templateStyle: { type: String, enum: ['classic', 'modern'], default: 'classic' },
    grandTotal:    { type: Number, default: 0 },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Invoice', invoiceSchema);
