import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
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

  let adminPassword = "rohan2006";
  var keyStore = Map.empty<Text, KeyRecord>();

  func getCurrentTime() : Int {
    Time.now() / 1_000_000;
  };

  func clearExpiredKeys() {
    let now = getCurrentTime();
    var tempStore = Map.empty<Text, KeyRecord>();

    keyStore.entries().forEach(func((k, v)) {
      if (v.expiryTimestamp >= now) {
        tempStore.add(k, v);
      };
    });

    keyStore := tempStore;
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
      expiryTimestamp = now + durationDays.toInt() * 86_400_000; // 24h = 86_400_000
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

    if (keyValue == adminPassword) {
      return {
        valid = true;
        message = "Admin key validated";
        isAdmin = true;
        expiryTimestamp = null;
      };
    };

    switch (keyStore.get(keyValue)) {
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
            keyStore.add(keyValue, updatedRecord);
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

    if (keyStore.containsKey(keyValue)) {
      keyStore.remove(keyValue);
      true;
    } else {
      false;
    };
  };

  public shared ({ caller }) func clearAllKeys(adminKey : Text) : async Bool {
    if (adminKey != adminPassword) {
      return false;
    };

    keyStore := Map.empty<Text, KeyRecord>();
    true;
  };

  func generateRandomNumber() : Nat {
    Int.abs(Time.now()) % 1_000_000;
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
};
