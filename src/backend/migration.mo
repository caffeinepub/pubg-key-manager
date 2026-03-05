import Map "mo:core/Map";
import Text "mo:core/Text";
module {
  type KeyRecord = {
    keyValue : Text;
    durationDays : Nat;
    expiryTimestamp : Int;
    boundDeviceId : ?Text;
    createdAt : Int;
  };

  type OldActor = {
    keyStore : Map.Map<Text, KeyRecord>;
  };

  type NewActor = {
    keyStore : Map.Map<Text, KeyRecord>;
  };

  public func run(old : OldActor) : NewActor {
    { keyStore = old.keyStore };
  };
};
