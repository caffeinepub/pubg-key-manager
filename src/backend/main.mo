import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

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

  let adminPassword = "rohan2006";
  var nextId = 0;

  let keyStore = Map.empty<Text, KeyRecord>();

  func getCurrentTime() : Int {
    Time.now() / 1_000_000;
  };

  func generateUniqueNumber() : Nat {
    nextId += 1;
    let timeComponent = Int.abs(Time.now()) % 1_000_000;
    let timePart = Int.abs(timeComponent) % 1_000_000;
    let combined = nextId * 1_000_000 + Int.abs(timePart);
    combined % 100_000_000; // Ensure it's at most 8 digits
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

  func padKey(key : Text) : Text {
    let numericPart = extractNumericPart(key);
    convertTo10DigitString(numericPart);
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

  public shared ({ caller }) func generateKey(adminKey : Text, durationDays : Nat) : async Text {
    clearExpiredKeys();

    if (adminKey != adminPassword) {
      return "ERROR:UNAUTHORIZED";
    };

    let generatedNumber = generateUniqueNumber();
    let numericPart = convertTo10DigitString(generatedNumber);

    let now = getCurrentTime();
    let newKey : KeyRecord = {
      keyValue = numericPart;
      durationDays;
      expiryTimestamp = now + durationDays * 86400000;
      boundDeviceId = null;
      createdAt = now;
    };

    keyStore.add(numericPart, newKey);
    numericPart;
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
    let normalizedKey = padKey(keyValue);

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

    let normalizedKey = padKey(keyValue);

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
};
