import t from 'tap'
import { DocumentsStore } from '../src/components/documents-store.js'
import { Index } from '../src/components/index.js'
import { getInternalDocumentId } from '../src/components/internal-document-id-store.js'
import { Result, create, insert, load, save, search } from '../src/index.js'
import { RadixTree } from '../src/trees/radix.js'
import type { AnyDocument } from '../src/types.js'

function extractOriginalDoc(result: Result<AnyDocument>[]): AnyDocument[] {
  return result.map(({ document }: AnyDocument) => document)
}

t.test('Edge getters', async (t) => {
  t.test('should correctly enable edge index getter', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        age: 'number'
      } as const
    })

    await insert(db, {
      name: 'John',
      age: 30
    })

    await insert(db, {
      name: 'Jane',
      age: 25
    })

    const { index } = save(db)
    const nameIndex = (index as Index).indexes['name']
    const newNameIndex = RadixTree.fromJSON(nameIndex.node)

    // Remember that tokenizers an stemmers sets content to lowercase
    t.ok(newNameIndex.contains('john'))
    t.ok(newNameIndex.contains('jane'))
  })

  t.test('should correctly enable edge docs getter', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        age: 'number'
      } as const
    })

    const doc1 = await insert(db, {
      name: 'John',
      age: 30
    })

    const doc2 = await insert(db, {
      name: 'Jane',
      age: 25
    })

    const { docs } = save(db)

    t.strictSame((docs as DocumentsStore).docs[getInternalDocumentId(db.internalDocumentIDStore, doc1)], {
      name: 'John',
      age: 30
    })
    t.strictSame((docs as DocumentsStore).docs[getInternalDocumentId(db.internalDocumentIDStore, doc2)], {
      name: 'Jane',
      age: 25
    })
  })

  t.test('should correctly enable index setter', async (t) => {
    const db = create({
      schema: {
        name: 'string',
        age: 'number'
      } as const
    })

    const jonh = {
      name: 'John',
      age: 30
    }

    const jane = {
      name: 'Jane',
      age: 25
    }

    const michele = {
      name: 'Michele',
      age: 27
    }

    const paolo = {
      name: 'Paolo',
      age: 37
    }

    await insert(db, jonh)
    await insert(db, jane)

    const db2 = create({
      schema: {
        name: 'string',
        age: 'number'
      } as const
    })

    await insert(db2, michele)
    await insert(db2, paolo)

    const dbData = save(db2)
    load(db, dbData)

    const search1 = await search(db, { term: 'Jane' })
    const search2 = await search(db, { term: 'John' })
    const search3 = await search(db, { term: 'Paolo' })
    const search4 = await search(db, { term: 'Michele' })

    t.equal(search1.count, 0)
    t.equal(search2.count, 0)
    t.equal(search3.count, 1)
    t.equal(search4.count, 1)

    t.strictSame(extractOriginalDoc(search3.hits), [paolo])
    t.strictSame(extractOriginalDoc(search4.hits), [michele])
  })

  t.test('should correctly save and load data', async (t) => {
    const originalDB = await create({
      schema: {
        name: 'string',
        age: 'number'
      } as const
    })

    await insert(originalDB, {
      name: 'Michele',
      age: 27
    })

    await insert(originalDB, {
      name: 'Paolo',
      age: 37
    })

    const DBData = save(originalDB)

    const newDB = create({
      schema: {
        name: 'string',
        age: 'number'
      }
    })

    load(newDB, DBData)

    const search1 = await search(originalDB, { term: 'Michele' })
    const search2 = await search(newDB, { term: 'Michele' })

    const search3 = await search(originalDB, { term: 'P' })
    const search4 = await search(newDB, { term: 'P' })

    t.strictSame(search1.hits, search2.hits)
    t.strictSame(search3.hits, search4.hits)
  })
})
