import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Char "mo:core/Char";
import Migration "migration";

(with migration = Migration.run)
actor {
  public type KeyRecord = {
    keyValue : Text;
    durationDays : Nat;
    expiryTimestamp : Int;
    boundDeviceId : ?Text;
    createdAt : Int;
  };

  public type ValidationResult = {
    valid : Bool;
    message : Text;
    isAdmin : Bool;
    expiryTimestamp : ?Int;
  };

  type KeyStore = Map.Map<Text, KeyRecord>;

  let adminPassword = "rohan2006";
  var keyStore : KeyStore = Map.empty();

  func getCurrentTime() : Int {
    Time.now() / 1_000_000;
  };

  public shared ({ caller }) func generateKey(adminKey : Text, durationDays : Nat) : async Text {
    clearExpiredKeys();

    if (adminKey != adminPassword) {
      return "ERROR:UNAUTHORIZED";
    };

    let keyNumber = generateRandomNumber() % 1_000_000;
    let keyValue = "GOD-" # durationDays.toText() # "DAY-" # natToPaddedText(keyNumber, 6);

    let now = getCurrentTime();
    let newKey : KeyRecord = {
      keyValue;
      durationDays;
      expiryTimestamp = now + durationDays * 86400000;
      boundDeviceId = null;
      createdAt = now;
    };

    keyStore.add(keyValue, newKey);
    keyValue;
  };

  public shared ({ caller }) func getKeys(adminKey : Text) : async [KeyRecord] {
    clearExpiredKeys();

    if (adminKey != adminPassword) {
      return [];
    };

    keyStore.values().toArray();
  };

  public shared ({ caller }) func validateAndBindKey(keyValue : Text, deviceId : Text) : async ValidationResult {
    clearExpiredKeys();
    let normalizedKey = normalizeKey(keyValue);

    if (normalizedKey == adminPassword) {
      return {
        valid = true;
        message = "Admin key validated";
        isAdmin = true;
        expiryTimestamp = null;
      };
    };

    switch (keyStore.get(normalizedKey)) {
      case (null) {
        { valid = false; message = "Invalid key"; isAdmin = false; expiryTimestamp = null };
      };
      case (?record) {
        let now = getCurrentTime();
        if (record.expiryTimestamp < now) {
          return {
            valid = false;
            message = "Key expired";
            isAdmin = false;
            expiryTimestamp = null;
          };
        };

        switch (record.boundDeviceId) {
          case (null) {
            let updatedRecord = {
              record with boundDeviceId = ?deviceId;
            };
            keyStore.add(normalizedKey, updatedRecord);
            {
              valid = true;
              message = "Key bound to device";
              isAdmin = false;
              expiryTimestamp = ?record.expiryTimestamp;
            };
          };
          case (?boundId) {
            if (boundId == deviceId) {
              {
                valid = true;
                message = "Key validated";
                isAdmin = false;
                expiryTimestamp = ?record.expiryTimestamp;
              };
            } else {
              {
                valid = false;
                message = "Key locked to another device";
                isAdmin = false;
                expiryTimestamp = null;
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteKey(adminKey : Text, keyValue : Text) : async Bool {
    clearExpiredKeys();

    if (adminKey != adminPassword) {
      return false;
    };

    let normalizedKey = normalizeKey(keyValue);

    switch (keyStore.get(normalizedKey)) {
      case (null) { false };
      case (?_) {
        keyStore.remove(normalizedKey);
        true;
      };
    };
  };

  public shared ({ caller }) func clearAllKeys(adminKey : Text) : async Bool {
    if (adminKey != adminPassword) {
      return false;
    };

    keyStore.clear();
    true;
  };

  func clearExpiredKeys() {
    let now = getCurrentTime();
    let expired = keyStore.filter(
      func(_, record) {
        record.expiryTimestamp < now;
      }
    );

    expired.values().forEach(
      func(record) {
        keyStore.remove(record.keyValue);
      }
    );
  };

  func generateRandomNumber() : Nat {
    let timeComponent = Int.abs(Time.now()) % 1_000_000;
    Int.abs(timeComponent) % 1_000_000;
  };

  func natToPaddedText(num : Nat, size : Nat) : Text {
    let numText = num.toText();
    let actualSize = numText.size();
    if (actualSize >= size) {
      return numText;
    };
    let padding = Array.repeat('0', size - actualSize);
    Text.fromArray(padding) # numText;
  };

  func normalizeKey(key : Text) : Text {
    if (key.startsWith(#text "GOD-")) {
      return key;
    };

    // Attempt to parse numeric part and reconstruct key if possible
    let digitsOnly = key.toArray().filter(
      func(ch) {
        ch >= '0' and ch <= '9';
      }
    );
    let digitsText = Text.fromArray(digitsOnly);

    if (digitsText.size() == 10) {
      // legacy 10-digit format, use as-is
      return digitsText;
    } else if (digitsText.size() == 6 + 10) {
      // Attempt to detect embedded 6-digit format
      let chars = digitsText.toArray();

      // Use .take for the first 6 characters and .drop for the rest
      let firstSix = Array.tabulate(6, func(i) { chars[i] });
      let rest = Array.tabulate(chars.size() - 6, func(i) { chars[i + 6] });

      let firstSixText = Text.fromArray(firstSix);
      let restText = Text.fromArray(rest);

      if (restText.size() == 10) {
        // legacy format, use rest as 'old' portion
        restText;
      } else {
        // Assume only 6-digit part, reconstruct default 7-day key
        "GOD-7DAY-" # firstSixText;
      };
    } else if (digitsText.size() == 6) {
      // If it's just 6 digits, default to 7-day key
      "GOD-7DAY-" # digitsText;
    } else {
      // Fallback: try to extract numeric part and zero-pad to 10 digits
      convertTo10DigitString(extractNumericPart(key));
    };
  };

  func convertTo10DigitString(num : Nat) : Text {
    let numText = num.toText();
    let paddingNeeded = if (numText.size() > 10) {
      0;
    } else {
      10 - numText.size();
    };
    let zeros = Array.repeat('0', paddingNeeded);
    Text.fromArray(zeros) # numText;
  };

  func extractNumericPart(key : Text) : Nat {
    switch (Nat.fromText(key)) {
      case (?num) { num % 1_000_000_000 }; // Ensure at most 9 digits
      case (null) {
        // If conversion fails, generate a random number (fallback)
        Runtime.trap("Invalid key format: " # key);
      };
    };
  };
};
