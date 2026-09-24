// TikTok's memory: which accounts to read, and what every video said last time. The collections
// are the ones written since 2026-09-23; the mechanics are the shared ones (../social/store.ts).
import { RentalTiktokAccountModel, type RentalTiktokAccountDocument } from "../../../models/RentalTiktokAccount";
import { RentalTiktokPostModel } from "../../../models/RentalTiktokPost";
import { mongoAccountStore, mongoPostStore, type SocialAccountStore, type SocialPostRow, type SocialPostStore } from "../social/store";

export type TiktokAccountRow = RentalTiktokAccountDocument;
export type TiktokPostRow = SocialPostRow;

export interface TiktokStore extends SocialAccountStore<TiktokAccountRow> {
  loadPosts: SocialPostStore["loadPosts"];
  savePosts: SocialPostStore["savePosts"];
}

const posts = mongoPostStore(RentalTiktokPostModel.collection.name);

/** The real store; without `APP_MONGO_URI` it remembers nothing and writes nothing. */
export const appDbTiktokStore: TiktokStore = {
  ...mongoAccountStore<TiktokAccountRow>(RentalTiktokAccountModel.collection.name, "uniqueId"),
  loadPosts: posts.loadPosts,
  savePosts: posts.savePosts,
};
