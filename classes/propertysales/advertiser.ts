import type { OpportunityListing } from "../propertyopportunities/types";
import { compatibleAdvertiserEvidence, retainAdvertiserFields, type AdvertiserPhysicalEvidence } from "../rentals/advertiserRetention";

export function retainSaleAdvertiser(previous: OpportunityListing | undefined, fresh: OpportunityListing): OpportunityListing {
  const evidence = (row: OpportunityListing | undefined): AdvertiserPhysicalEvidence | null => row ? {
    title: row.title, description: row.description, address: row.address, department: row.department,
    locality: row.locality, neighborhood: row.neighborhood, propertyType: row.propertyType,
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, area: row.area?.value,
  } : null;
  return retainAdvertiserFields(previous, fresh, previous?.operation === fresh.operation && compatibleAdvertiserEvidence(evidence(previous), evidence(fresh)));
}
