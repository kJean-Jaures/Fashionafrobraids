// Prestations retirées à la demande du propriétaire. Leurs rendez-vous
// historiques conservent leurs propres données et ne sont pas supprimés.
export const retiredServiceIds = ["barber-contours", "coupe-homme", "coupe-a-sec", "coupe-pointes"];
export const retiredReferenceIds = [85579014, 85579094, 85579143, 85580584, 85581262, 85580607];
export const retiredGalleryIds = [
  "acuity-85579014", "acuity-85579094", "acuity-85579143", "reference-coupe-homme",
  ...[4, 5, 7, 12, 15, 16].map(index => `goodhair-gallery-${index}`),
];
