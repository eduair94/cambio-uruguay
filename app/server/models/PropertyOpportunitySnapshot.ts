import mongoose, { Schema } from 'mongoose'
import type { OpportunityOperation } from '../../utils/propertyOpportunities'
import type { PropertyOpportunitySnapshot } from '../../utils/propertyOpportunityQuery'

interface PropertyOpportunitySnapshotDocument {
  key: OpportunityOperation
  generatedAt: string
  snapshot: PropertyOpportunitySnapshot
}

const PropertyOpportunitySnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, autoCreate: false, autoIndex: false }
)
PropertyOpportunitySnapshotSchema.index({ key: 1 }, { unique: true })

export const PropertyOpportunitySnapshotModel =
  (mongoose.models
    .PropertyOpportunitySnapshot as mongoose.Model<PropertyOpportunitySnapshotDocument>) ||
  mongoose.model<PropertyOpportunitySnapshotDocument>(
    'PropertyOpportunitySnapshot',
    PropertyOpportunitySnapshotSchema,
    'propertyopportunitysnapshots'
  )
