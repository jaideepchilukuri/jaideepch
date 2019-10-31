import React from "react";

export function renderExcludes(excludes) {
  if (excludes) {
    return Object.keys(excludes).map(type =>{
      let stringVal = JSON.stringify(excludes[type], null, 1);
      return <div key={type}><em>{type}</em>: {stringVal}</div>;
    });
  }  
}