import {
    MongoClient,
    Collection,
    Database
} from "https://deno.land/x/mongo@v0.31.1/mod.ts";

export class MongoStorage{
    private client!: MongoClient
    private database!: Database
    dbName: string

    constructor(dbName: string){
        this.dbName = dbName;
        
    }

    async start(mongoIp="mongodb://127.0.0.1:27017"){
        this.client = new MongoClient()
        await this.client.connect(mongoIp) //By default 
        this.database = this.client.database(this.dbName)
        return this.client
    }

    createCollection(collectionName: string): Collection<any>{
        const collection = this.database.collection(collectionName)
        return collection
    }

    getCollectionNames(){
        return this.database.listCollectionNames()
    }

    hasCollection(collectionName: string): Boolean{
        const collectionExists = this.database.collection(collectionName)
        return (collectionExists? true : false)
    }

    async hasEntry(id: number, collectionName: string): Promise<Boolean>{
        const entryFound = await this.get(id, collectionName)
        return (entryFound !== undefined ? true : false)
    }

    retrieveCollection(collectionName: string): Collection<any>{
        if(!this.hasCollection(collectionName)) throw Error(`Collection named ${collectionName} does not exist`)
        const collection = this.database.collection(collectionName)
        return collection
    }

    async add(entry: Record<string, any>, collectionName:string): Promise<any>{
        if(entry.id === undefined) throw Error("Entry needs ID")
        const collection = this.retrieveCollection(collectionName)
        const uuid = await collection.insertOne(entry);

        return { success:uuid, entry:entry }
    }

    async get(id: number, collectionName:string): Promise<Record<string, any>|undefined>{
        const collection = this.retrieveCollection(collectionName)
        const entry = await collection.findOne({ id: id });
        return entry
    }

    async getAll(collectionName:string): Promise<any>{
        const collection = this.retrieveCollection(collectionName)

        interface entriesFound{
            [id:number]: Record<string, any>
        }

        const entriesFound:entriesFound = {}

        const cursor = collection.find();

        for await (const entry of cursor) {
            entriesFound[entry.id] = entry
        }

        return entriesFound
    }

    async update(entry: Record<string, any>, collectionName: string){
        const collection = this.retrieveCollection(collectionName)
        if(entry.id === undefined) throw Error("entry object needs to contain ID property to update it")

        const updated = await collection.updateOne({ id:entry.id }, { $set:{ ...entry } })

        return updated
    }

    async delete(id: number, collectionName: string){
        const collection = this.retrieveCollection(collectionName)
        if(id === undefined) throw Error("Need to provide ID of entry")
        const entryBackup = await collection.findOne({ id: id })
        if(entryBackup === undefined) throw Error(`entry ID ${id} to delete not found`)
        const deleted = await collection.deleteOne({ id: id });

        return { isDeleted:deleted, entry:entryBackup }
    }

    closeConnection(){
        this.client.close()
    }
}

