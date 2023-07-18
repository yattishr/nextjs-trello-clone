import { create } from "zustand";
import { getTodosGroupedByColumn } from "@/lib/getTodosGroupedByColumn";
import { ID, databases, storage } from "@/appwrite";
import uploadImage from "@/lib/uploadImage";

interface BoardState {
  board: Board;
  getBoard: () => Promise<void>;
  setBoardState: (board: Board) => void;
  updateTodoInDB: (todo: Todo, columnId: TypedColumn) => void;

  // state variables for image for Modal dialog;
  image: File | null;
  setImage: (image: File | null) => void;

  // state variables for Modal dialog
  newTaskInput: string;
  setNewTaskInput: (input: string) => void;

  // state variables for Modal Dialog
  newTaskType: TypedColumn;
  setNewTaskType: (columnId: TypedColumn) => void;

  // search string params
  searchString: string;
  setSearchString: (searchString: string) => void;

  // add task function
  addTask: (todo: string, columnId: TypedColumn, image?: File | null) => void;

  // delete task function
  deleteTask: (taskIndex: number, todo: Todo, id: TypedColumn) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: {
    columns: new Map<TypedColumn, Column>(),
  },

  // initial state valies for searchString.
  searchString: "",
  setSearchString: (searchString) => set({ searchString }),

  // initial state values for dialog modal.
  newTaskInput: "",
  setNewTaskInput: (input: string) => set({ newTaskInput: input }),
  
  // initial state values for dialog modal.
  newTaskType: "todo",
  setNewTaskType: (columnId: TypedColumn) => set({ newTaskType: columnId }),

  // initial state values for image selection
  image: null,
  setImage: (image: File | null) => set({ image }),

  // initial values for Board state
  getBoard: async () => {
    const board = await getTodosGroupedByColumn();
    set({ board });
  },

  setBoardState: (board) => set({ board }),

  updateTodoInDB: async (todo, columnId) => {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_TODOS_COLLECTION_ID!,
      todo.$id,
      {
        title: todo.title,
        status: columnId,
      }
    );
  },

  addTask: async (todo: string, columnId: TypedColumn, image?: File | null) => {
    let file: Image | undefined;

    if (image) {
      const fileUploaded = await uploadImage(image);
      if (fileUploaded) {
        file = {
          bucketId: fileUploaded.bucketId,
          fileId: fileUploaded.$id,
        };
      }
    }

    // create a document on appwrite
    const { $id } = await databases.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_TODOS_COLLECTION_ID!,
      ID.unique(),
      {
        title: todo,
        status: columnId,
        // include image if it exists
        ...(file && { image: JSON.stringify(file) }),
      }
    );

    set({ newTaskInput: "" });

    set((state) => {
      const newColumns = new Map(state.board.columns);
      const newTodo: Todo = {
        $id,
        $createdAt: new Date().toISOString(),
        title: todo,
        status: columnId,
        ...(file && { image: file }),
      };

      const column = newColumns.get(columnId);

      if (!column) {
        newColumns.set(columnId, {
          id: columnId,
          todos: [newTodo],
        });
      } else {
        newColumns.get(columnId)?.todos.push(newTodo);
      }

      return {
        board: {
          columns: newColumns,
        },
      };
    });
  },

  deleteTask: async (taskIndex: number, todo: Todo, id: TypedColumn) => {
    const newColumns = new Map(get().board.columns);

    // delete todoId from newColumns.
    newColumns.get(id)?.todos.splice(taskIndex, 1);

    // replace the existing board columns with the updated columns => newColumns.
    set({ board: { columns: newColumns } });

    // delete Image from AppWrite storage bucket.
    if (todo.image) {
      await storage.deleteFile(todo.image.bucketId, todo.image.fileId);
    }

    // delete from AppWrite DB
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_TODOS_COLLECTION_ID!,
      todo.$id
    );
  },
}));
