"use client";

import { useEffect } from "react";

export function ConsoleWelcome() {
  useEffect(() => {
    console.clear();
    console.log(
      `%c
      db      
     ;MM:     
    ,V^MM.    
   ,M  'MM    
   AbmmmqMA   
  A'     VML  
.AMA.   .AMMA.
`,
      "font-family: monospace; color: #3b82f6; font-weight: bold;"
    );
  }, []);

  return null;
}
