#!/bin/bash
for f in $(find apps/web/src/pages -type f -name "*.tsx"); do
  if grep -q "<Dialog" "$f"; then
    echo "--- $f ---"
    
    # Check for early return null pattern
    if grep -q "return null" "$f"; then
      echo "[⚠️] Uses return null (Potential drop of exit animation)"
    fi
    
    # Check if inputs exist
    has_inputs=$(grep -c "<input" "$f")
    has_textarea=$(grep -c "<textarea" "$f")
    
    if [ "$has_inputs" -gt "0" ] || [ "$has_textarea" -gt "0" ]; then
      if ! grep -q "useFormFieldNavigation" "$f"; then
         echo "[⚠️] Has form inputs but lacks useFormFieldNavigation / KeyboardToolbar"
      fi
    fi
    
    # Check actions footer
    if ! grep -q "<StickyFooter" "$f"; then
      echo "[⚠️] Missing StickyFooter for actions"
    fi
  fi
done
