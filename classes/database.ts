import mongoose, { Schema as MongooseSchema, FilterQuery, UpdateQuery, QueryOptions, AggregateOptions, PipelineStage } from "mongoose";
import { mongoConfig } from "../config";
const Schema = MongooseSchema;

export class MongooseServer {
  private static att = 0;
  private static instances: Record<string, MongooseServer> = {};
  private static db: any = {};
  private static connectionAllowed = false;
  private Model: mongoose.Model<any>;
  private max_att = 3;
  private timeout = 200;

  private constructor(document: string, schema: mongoose.Schema) {
    this.Model = mongoose.model(document, schema);
  }

  public static getInstance(document: string, schema: mongoose.Schema): MongooseServer {
    const m = MongooseServer;
    if (!m.instances[document]) {
      m.instances[document] = new MongooseServer(document, schema);
    }
    return m.instances[document];
  }

  private connectionError = {
    error: "Connection Error",
  };

  async aggregate(aggQuery: PipelineStage[], att = 0): Promise<any[]> {
    try {
      const res = await this.getModel().aggregate(aggQuery).exec();
      return res && res.length ? res : [];
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.aggregate(aggQuery, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  async findEntry(entry: any, att = 0): Promise<any> {
    if (!MongooseServer.connectionAllowed) {
      return this.connectionError;
    }
    try {
      const doc = await this.Model.findOne(entry, {}).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.findEntry(entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async allEntriesSort(param: any, sort: any, att = 0): Promise<any[]> {
    const r = await this.Model.find(param).select('-_id -__v').sort(sort).lean();
    return r;
  }

  public async allEntries(param: any, att = 0): Promise<any[]> {
    try {
      const result = await this.Model.find(param, { '_id': 0, '__v': 0 }).lean().exec();
      return result;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.allEntries(param, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async dropCollection(): Promise<void> {
    await this.Model.collection.drop();
  }

  public async allEntriesExclusion(param: any, exclusion: any, att = 0): Promise<any[]> {
    try {
      const result = await this.Model.find(param, exclusion).lean().exec();
      return result;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.allEntriesExclusion(param, exclusion, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async countEntries(param: any = {}, att = 0): Promise<number> {
    try {
      const result = await this.Model.countDocuments(param).exec();
      return result;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.countEntries(param, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async saveEntries(entries: Array<any>, att = 0): Promise<boolean> {
    try {
      await this.Model.insertMany(entries);
      return true;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.saveEntries(entries, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async saveEntry(entry: any, att = 0): Promise<any> {
    try {
      const doc = await this.Model.create(entry);
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.saveEntry(entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async findHistoryEntry(entry: any, att = 0): Promise<any[]> {
    try {
      const docs = await this.Model.find(entry).lean().exec();
      return docs;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.findHistoryEntry(entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async addToSet(entry: any, items: any, att = 0): Promise<any> {
    const options = {
      upsert: true,
      useFindAndModify: false,
      setDefaultsOnInsert: true,
    };
    try {
      const doc = await this.Model.updateOne(entry, items, options).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.addToSet(entry, items, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async getAnUpdateEntryAlt(entryGet: any, entry: any, att = 0): Promise<any> {
    const query = entryGet;
    const update = entry;
    const options = {
      upsert: true,
      useFindAndModify: false,
      setDefaultsOnInsert: true,
    };
    try {
      const doc = await this.Model.findOneAndUpdate(query, update, options).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.getAnUpdateEntryAlt(entryGet, entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async getAnUpdateEntry(entryGet: any, entryE: any, att = 0): Promise<any> {
    const entry = { ...entryE };
    const query = entryGet;
    const keys = Object.keys(query);
    keys.forEach((key) => {
      delete entry[key];
    });
    const update = entry;
    const options = {
      upsert: true,
      useFindAndModify: false,
      setDefaultsOnInsert: true,
    };
    try {
      const doc = await this.Model.findOneAndUpdate(query, update, options).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.getAnUpdateEntry(entryGet, entryE, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async pushEntry(entry: any, toPush: any, att = 0): Promise<any> {
    const pushMongo = { $push: toPush };
    const options = {
      upsert: true,
      useFindAndModify: false,
      setDefaultsOnInsert: true,
      new: true,
    };
    try {
      const doc = await this.Model.findOneAndUpdate(entry, pushMongo, options).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.pushEntry(entry, toPush, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async deleteEntry(entry: any, att = 0): Promise<any> {
    try {
      const doc = await this.Model.deleteOne(entry).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.deleteEntry(entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async deleteMany(args: any = {}, att = 0): Promise<any> {
    try {
      const doc = await this.Model.deleteMany(args).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.deleteMany(args, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async deleteAll(att = 0): Promise<any> {
    try {
      const doc = await this.Model.deleteMany({}).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.deleteAll(att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public getModel(): mongoose.Model<any> {
    return this.Model;
  }

  public async updateMany(entryGet: any, entry: any, att = 0): Promise<any> {
    try {
      const doc = await this.Model.updateMany(entryGet, entry, {}).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.updateMany(entryGet, entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async updateOneAlt(entryGet: any, entry: any, att = 0): Promise<any> {
    try {
      const doc = await this.Model.updateOne(entryGet, entry, {}).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.updateOneAlt(entryGet, entry, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public async updateOne(entryGet: any, entryUpdate: any, att = 0): Promise<any> {
    const entry = { ...entryUpdate };
    Object.keys(entryGet).forEach((key) => {
      delete entry[key];
    });
    const options = {
      upsert: true,
      useFindAndModify: false,
      setDefaultsOnInsert: true,
    };
    try {
      const doc = await this.Model.updateOne(entryGet, entry, options).lean().exec();
      return doc;
    } catch (error) {
      if (att < this.max_att) {
        await new Promise(r => setTimeout(r, this.timeout));
        return this.updateOne(entryGet, entryUpdate, att + 1);
      }
      console.error(error);
      throw error;
    }
  }

  public static connectWithRetry = (): any => {
    mongoose.set("strictQuery", false);
    mongoose
      .connect(`mongodb://localhost:27017/${mongoConfig.database}`, {})
      .catch(() => {});
  };

  public static dealConnection = (): void => {
    // If the connection throws an error
    mongoose.connection.on("error", (err) => {
      console.log("Error Connection", err);
      return;
    });

    // When the connection is disconnected
    mongoose.connection.on("disconnected", () => {
      console.log("Disconnected");
      return;
    });
  };

  public static first = true;
  public static retry = true;

  public static isConnected(): boolean {
    return mongoose.connection.readyState === 1 && MongooseServer.connectionAllowed;
  }

  public static getConnectionState(): { connected: boolean; readyState: number; readyStateText: string } {
    const readyState = mongoose.connection.readyState;
    const stateMap: Record<number, string> = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    return {
      connected: readyState === 1 && MongooseServer.connectionAllowed,
      readyState,
      readyStateText: stateMap[readyState] || "unknown",
    };
  }

  public static closeConnection(): void {
    MongooseServer.retry = false;
    mongoose.connection.close();
  }

  public static startConnectionPromise(): Promise<any> {
    return new Promise((cb) => {
      const s = MongooseServer;
      s.connectWithRetry();
      s.db = mongoose.connection;
      MongooseServer.dealConnection();
      s.db.once("open", () => {
        console.log("Connection to mongoose database started", s.first);
        s.connectionAllowed = true;
        if (s.first) {
          s.first = false;
          return cb(true);
        }
      });
    });
  }

  public static startConnection(cb: Function): void {
    const s = MongooseServer;
    s.connectWithRetry();
    s.db = mongoose.connection;
    MongooseServer.dealConnection();
    s.db.once("open", () => {
      console.log("Connection to mongoose database started", s.first);
      s.connectionAllowed = true;
      if (s.first) {
        s.first = false;
        return cb(true);
      }
    });
  }
}

export { mongoose, Schema };
