import { create } from "zustand";
import { getTodosGroupedByColumn } from "@/lib/getTodosGroupedByColumn";
import { databases, storage } from "@/appwrite";

interface BoardState {
  board: Board;
  getBoard: () => Promise<void>;
  setBoardState: (board: Board) => void;
  updateTodoInDB: (todo: Todo, columnId: TypedColumn) => void;
  
  // state variables for Modal dialog
  newTaskInput: string;
  setNewTaskInput: (input: string) => void;

  // state variables for Modal Dialog
  newTaskType: TypedColumn,
  setNewTaskType: (columnId: TypedColumn) => void;

  // search string params
  searchString: string;
  setSearchString: (searchString: string) => void;

  // delete task function
  deleteTask: (taskIndex: number, todo: Todo, id: TypedColumn) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: {
    columns: new Map<TypedColumn, Column>(),
  },

  // initialize searchString with blank val.
  searchString: "",
  setSearchString: (searchString) => set({ searchString }),

  // state values for dialog modal.
  newTaskInput: "",
  setNewTaskInput: (input: string) => set({ newTaskInput: input }),

  // state values for dialog modal.
  newTaskType: "todo",
  setNewTaskType: (columnId: TypedColumn) => set({newTaskType: columnId}),

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
