"use client";

import React, { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { PrototypeStoreState, PrototypeStoreAction, NewFormInput, NewCollectionInput } from "./types";
import { prototypeReducer } from "./reducer";
import { loadPrototypeState, savePrototypeState } from "./storage";
import { createInitialPrototypeState } from "./fixtures";

type PrototypeContextType = {
  state: PrototypeStoreState;
  dispatch: React.Dispatch<PrototypeStoreAction>;
  isHydrated: boolean;
  createForm: (input: NewFormInput) => void;
  acceptForm: (formId: string) => void;
  rejectForm: (formId: string, reason: string) => void;
  cancelForm: (formId: string) => void;
  createCollection: (input: NewCollectionInput) => void;
  resetStore: () => void;
};

const PrototypeContext = createContext<PrototypeContextType | null>(null);

export function PrototypeStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(prototypeReducer, null, () => createInitialPrototypeState());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const persisted = loadPrototypeState();
    dispatch({ type: "hydrate", state: persisted });
    Promise.resolve().then(() => {
      setIsHydrated(true);
    });
  }, []);

  // Persist state to sessionStorage only after successful hydration
  useEffect(() => {
    if (isHydrated) {
      savePrototypeState(state);
    }
  }, [state, isHydrated]);

  const createForm = (input: NewFormInput) => {
    dispatch({ type: "create_form", input, now: new Date().toISOString() });
  };

  const acceptForm = (formId: string) => {
    dispatch({ type: "accept_form", formId, now: new Date().toISOString() });
  };

  const rejectForm = (formId: string, reason: string) => {
    dispatch({ type: "reject_form", formId, reason, now: new Date().toISOString() });
  };

  const cancelForm = (formId: string) => {
    dispatch({ type: "cancel_form", formId, now: new Date().toISOString() });
  };

  const createCollection = (input: NewCollectionInput) => {
    dispatch({ type: "create_collection", input, now: new Date().toISOString() });
  };

  const resetStore = () => {
    dispatch({ type: "reset" });
  };

  return (
    <PrototypeContext.Provider
      value={{
        state,
        dispatch,
        isHydrated,
        createForm,
        acceptForm,
        rejectForm,
        cancelForm,
        createCollection,
        resetStore,
      }}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototypeStore() {
  const context = useContext(PrototypeContext);
  if (!context) {
    throw new Error("usePrototypeStore must be used within a PrototypeStoreProvider");
  }
  return context;
}
